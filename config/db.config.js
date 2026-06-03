const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("  \x1b[1;33m» DATABASE:\x1b[0m   \x1b[1;32mConnected & Synced (MySQL Native)\x1b[0m");
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, prisma };

