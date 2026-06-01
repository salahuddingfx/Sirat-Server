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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  \x1b[1;34m» STATUS:\x1b[0m    \x1b[1mOnline & Listening\x1b[0m
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

