const env = require("./config/env.config");
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { eq } = require("drizzle-orm");
const { product: productTable } = require("./db/schema");
const helmet = require("helmet");
const xss = require("./middleware/xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const { connectDB, prisma } = require("./config/db.config");

const app = express();

// ETag stays enabled in all environments so clients get proper 304 Not Modified
// responses when content hasn't changed. This saves bandwidth in both dev and prod.
app.enable("etag");
app.set("etag", "strong");

// Global unhandled rejection handler (prevents crash on promise rejections)
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});

// Security Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
})); // Set security HTTP headers
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(compression()); // Compress all responses

// Request/Response Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    let statusColor = "\x1b[32m"; // Green for 2xx
    if (res.statusCode >= 500) statusColor = "\x1b[31m"; // Red for 5xx
    else if (res.statusCode >= 400) statusColor = "\x1b[33m"; // Yellow for 4xx
    else if (res.statusCode >= 300) statusColor = "\x1b[36m"; // Cyan for 3xx

    console.log(
      `[\x1b[35m${new Date().toLocaleTimeString()}\x1b[0m] \x1b[1m${req.method}\x1b[0m ${req.originalUrl} - ${statusColor}${res.statusCode}\x1b[0m (${duration}ms)`
    );
  });
  next();
});

// Middleware
app.use(cors({
  origin: env.corsOrigins,
  credentials: true,
}));

// Body parsers MUST be registered before any route that needs a body
app.use(express.json({ limit: env.body.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: env.body.jsonLimit }));

// Compatibility middleware: maps "id" to "_id" recursively in JSON responses for client/admin compatibility
const mapIdToUnderscoreId = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(mapIdToUnderscoreId);
  }
  if (typeof obj === "object") {
    if (obj instanceof Date || Buffer.isBuffer(obj)) return obj;
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = mapIdToUnderscoreId(obj[key]);
      }
    }
    if ("id" in obj && !("_id" in obj)) {
      newObj._id = obj.id;
    }
    return newObj;
  }
  return obj;
};

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === "object") {
      body = mapIdToUnderscoreId(body);
    }
    return originalJson.call(this, body);
  };
  next();
});

// Serve static uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Public tracking endpoint with its own more-lenient rate limit
// (each pageview shouldn't compete with auth/data API quota)
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/track", trackLimiter, require("./routes/track.routes"));

// Rate limiting for all other API routes
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
});
app.use("/api", limiter);

// API Info Route
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to Sirat API" });
});

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/orders", require("./routes/order.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/admin/analytics", require("./routes/analytics.routes"));
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/hero", require("./routes/hero.routes"));
app.use("/api/reviews", require("./routes/review.routes"));
app.use("/api/contact", require("./routes/contact.routes"));
app.use("/api/coupons", require("./routes/coupon.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/newsletter", require("./routes/newsletter.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/flash-sale", require("./routes/flashSale.routes"));
app.use("/api/password", require("./routes/password.routes"));
app.use("/api/cart", require("./routes/cart.routes"));
app.use("/api/wishlist", require("./routes/wishlist.routes"));

// Helper to get the correct path to the client's index.html depending on environment (dev vs production cPanel)
const getClientIndexPath = () => {
  const paths = [
    path.join(__dirname, "../client/dist/index.html"),            // Local dev / monorepo
    path.join(__dirname, "../sirat.salahuddin.codes/index.html"),   // Production cPanel storefront
    path.join(__dirname, "client/dist/index.html")              // Nested fallback
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
};

// Serve static client build files (JS, CSS, images, etc.)
app.use(express.static(path.join(__dirname, "../client/dist")));
app.use(express.static(path.join(__dirname, "../sirat.salahuddin.codes")));

// Intercept product page requests for dynamic SEO tag injection
app.get("/product/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Fetch product details from the database using Drizzle
    const product = await prisma.query.product.findFirst({
      where: eq(productTable.slug, slug),
      with: {
        images: true,
      },
    });

    const indexPath = getClientIndexPath();

    // Read compiled index.html
    let htmlContent;
    if (!indexPath) {
      console.warn("Client build index.html is missing.");
      return res.status(404).send("Storefront build index.html is missing. Please run build and deploy the client storefront.");
    }

    try {
      htmlContent = fs.readFileSync(indexPath, "utf8");
    } catch (readErr) {
      console.warn("Client build index.html failed to read at:", indexPath);
      return res.status(404).send("Storefront build is missing or unreadable.");
    }

    if (!product) {
      // Product not found, serve default index.html so frontend router handles 404
      return res.send(htmlContent);
    }

    // Prepare metadata
    const productName = product.name;
    const cleanDescription = product.description
      ? product.description.replace(/<[^>]*>/g, "").substring(0, 160).trim()
      : "";
    const productUrl = `${env.clientUrl}/product/${slug}`;

    // Determine the product image URL (use first image, fallback to sirat.png or sirat.jpg)
    let imageUrl = `${env.clientUrl}/Sirat.png`;
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0].url;
      if (firstImage.startsWith("http")) {
        imageUrl = firstImage;
      } else {
        imageUrl = `${env.clientUrl}${firstImage.startsWith("/") ? "" : "/"}${firstImage}`;
      }
    }

    // Replaces in HTML content for crawler previews
    htmlContent = htmlContent
      .replace(/<title>.*?<\/title>/gi, `<title>${productName} | Sirat</title>`)
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi,
        `<meta name="description" content="${cleanDescription}" />`
      )
      // Open Graph Tags
      .replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/gi,
        `<meta property="og:title" content="${productName} | Sirat" />`
      )
      .replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/gi,
        `<meta property="og:description" content="${cleanDescription}" />`
      )
      .replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/gi,
        `<meta property="og:url" content="${productUrl}" />`
      )
      .replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/gi,
        `<meta property="og:image" content="${imageUrl}" />`
      )
      .replace(
        /<meta\s+property="og:image:secure_url"\s+content="[^"]*"\s*\/?>/gi,
        `<meta property="og:image:secure_url" content="${imageUrl}" />`
      )
      // Twitter Card Tags
      .replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/gi,
        `<meta name="twitter:title" content="${productName} | Sirat" />`
      )
      .replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/gi,
        `<meta name="twitter:description" content="${cleanDescription}" />`
      )
      .replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/gi,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

    res.setHeader("Content-Type", "text/html");
    return res.send(htmlContent);
  } catch (error) {
    console.error("Dynamic SEO Tag Injection Error:", error);
    next(error);
  }
});

// Wildcard Route for Single-Page Application (SPA) fallback
app.get("*splat", (req, res) => {
  const indexPath = getClientIndexPath();
  if (indexPath) {
    res.sendFile(indexPath);
  } else {
    // If client build is missing, don't crash with 500 ENOENT. 
    // Gracefully handle requests to API/root, or return 404 for other paths.
    if (req.path === "/" || req.path === "/api" || req.path === "/api/") {
      return res.json({ message: "Welcome to Sirat API" });
    }
    res.status(404).json({
      success: false,
      message: "Storefront build is missing. Server is online but index.html could not be located.",
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.stack}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: env.nodeEnv === "development" ? err.stack : undefined,
  });
});

const PORT = env.port;

app.listen(PORT, () => {
  const banner = `
\x1b[38;5;178m ███████╗██╗██████╗  █████╗ ████████╗
 ██╔════╝██║██╔══██╗██╔══██╗╚══██╔══╝
 ███████╗██║██████╔╝███████║   ██║   
 ╚════██║██║██╔══██╗██╔══██║   ██║   
 ███████║██║██║  ██║██║  ██║   ██║   
 ╚══════╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝\x1b[0m

  \x1b[1;35m» DEVELOPER:\x1b[0m \x1b[1mSalah Uddin Kader\x1b[0m
  \x1b[1;36m» SERVICE:\x1b[0m   \x1b[1mSIRAT REST API\x1b[0m
  \x1b[1;33m» ENV:\x1b[0m       \x1b[1m${env.nodeEnv}\x1b[0m
  \x1b[1;32m» PORT:\x1b[0m      \x1b[1;32m${PORT}\x1b[0m
  \x1b[1;34m» STATUS:\x1b[0m    \x1b[1;34mOnline & Listening\x1b[0m
  \x1b[1;36m» CACHE:\x1b[0m     \x1b[1mIn-memory cache enabled (ETag active)\x1b[0m
  \x1b[1;35m» CORS:\x1b[0m      \x1b[1m${env.corsOrigins.join(", ")}\x1b[0m
  \x1b[1;33m» RATE LIMIT:\x1b[0m \x1b[1m${env.rateLimit.max} req / ${Math.round(env.rateLimit.windowMs / 1000)}s\x1b[0m
  `;
  
  const lines = banner.split("\n");
  let idx = 0;
  function showLine() {
    if (idx < lines.length) {
      console.log(lines[idx]);
      idx++;
      setTimeout(showLine, 40);
    }
  }
  showLine();

  // Connect to database after banner
  setTimeout(() => connectDB(), 50);
});

module.exports = app;

