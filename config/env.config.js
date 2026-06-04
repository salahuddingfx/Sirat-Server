require("dotenv").config();

const toInt = (val, fallback) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 5000),
  // database connection uses DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT or DATABASE_URL
  jwtSecret: process.env.JWT_SECRET || "your_default_jwt_secret_here",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  clientUrl: process.env.CLIENT_URL || "https://sirat.salahuddin.codes",
  corsOrigins: [
    ...(process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
      : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]),
    "https://sirat.salahuddin.codes",
    "https://sirat-admin.salahuddin.codes",
    "https://sirat-api.salahuddin.codes"
  ],
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
  },
  body: {
    jsonLimit: process.env.BODY_JSON_LIMIT || "10kb",
  },
  upload: {
    maxMb: toInt(process.env.UPLOAD_MAX_MB, 5),
  },

  mail: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.MAIL_FROM_EMAIL,
    fromName: process.env.MAIL_FROM_NAME,
    brevoApiKey: process.env.BREVO_API_KEY,
  },
};

// Validate that critical env variables are loaded
const criticalKeys = ["JWT_SECRET"];
criticalKeys.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`\x1b[33m[Warning] Critical environment variable is missing: ${key}\x1b[0m`);
  }
});

module.exports = env;
