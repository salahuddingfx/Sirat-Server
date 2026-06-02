const env = require("./config/env.config");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("./middleware/mongo-sanitize");
const xss = require("./middleware/xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const connectDB = require("./config/db.config");

const app = express();

// ETag handling:
// - Development: disable ETag and Last-Modified so responses are always 200
//   (cleaner logs; cache.config.js handles freshness in-memory)
// - Production: keep ETag/Last-Modified enabled for proper 304 Not Modified
//   responses (saves bandwidth for clients that send If-None-Match)
if (env.nodeEnv === "development") {
  app.disable("etag");
  app.set("etag", false);
} else {
  app.enable("etag");
  app.set("etag", "strong");
}

// Global unhandled rejection handler (prevents crash on promise rejections)
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Sanitize data against NoSQL injection
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(compression()); // Compress all responses

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use("/api", limiter);

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

// Strip conditional request headers so Express never responds with 304 (dev only)
// In production, keep ETag/If-None-Match so 304 Not Modified can be returned
// to save bandwidth.
if (env.nodeEnv === "development") {
  app.use((req, res, next) => {
    delete req.headers["if-none-match"];
    delete req.headers["if-modified-since"];
    delete req.headers["if-match"];
    delete req.headers["if-unmodified-since"];
    delete req.headers["if-range"];

    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function (name, value) {
      if (typeof name === "string") {
        const lower = name.toLowerCase();
        if (lower === "etag" || lower === "last-modified") {
          return res;
        }
      }
      return originalSetHeader(name, value);
    };

    next();
  });
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  // In dev: force 200 for OPTIONS preflight instead of 204
  // In production: leave default (204 for legacy compat, but modern browsers accept 200)
  optionsSuccessStatus: env.nodeEnv === "development" ? 200 : 204,
}));

// Intercept all OPTIONS (CORS preflight) requests in dev only,
// return 200 instead of letting it fall through with 204.
if (env.nodeEnv === "development") {
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    next();
  });
}

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Basic Route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Sirat API" });
});

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/orders", require("./routes/order.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/hero", require("./routes/hero.routes"));
app.use("/api/reviews", require("./routes/review.routes"));
app.use("/api/contact", require("./routes/contact.routes"));
app.use("/api/coupons", require("./routes/coupon.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/newsletter", require("./routes/newsletter.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/flash-sale", require("./routes/flashSale.routes"));

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
  \x1b[1;36m» CACHE:\x1b[0m     \x1b[1m${env.nodeEnv === "development" ? "ETag disabled (200s only)" : "ETag enabled (304 supported)"}\x1b[0m
  `;
  
  const lines = banner.split("\n");
  let idx = 0;
  function showLine() {
    if (idx < lines.length) {
      console.log(lines[idx]);
      idx++;
      setTimeout(showLine, 40); // 40ms per line animation
    }
  }
  showLine();
});

module.exports = app;

