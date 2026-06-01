require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || "your_default_jwt_secret_here",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  }
};

// Validate that critical env variables are loaded
const criticalKeys = ["MONGO_URI", "JWT_SECRET"];
criticalKeys.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`\x1b[33m[Warning] Critical environment variable is missing: ${key}\x1b[0m`);
  }
});

module.exports = env;
