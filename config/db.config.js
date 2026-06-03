const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("  \x1b[1;33m» DATABASE:\x1b[0m   \x1b[1;32mConnected & Synced (MySQL)\x1b[0m");
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    // We don't exit process here because we might want to retry or handle it
    // But for a migration, it's critical.
    process.exit(1);
  }
};

module.exports = { connectDB, prisma };
