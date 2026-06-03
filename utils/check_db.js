const { prisma, connectDB } = require("../config/db.config");

async function check() {
  try {
    console.log("Checking database connection...");
    await connectDB();
    console.log("Successfully connected to MySQL via Prisma!");

    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    const categoryCount = await prisma.category.count();

    console.log("\x1b[32mStats:\x1b[0m");
    console.log(`- Products: ${productCount}`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Categories: ${categoryCount}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("\x1b[31mDatabase check failed:\x1b[0m", err.message);
    process.exit(1);
  }
}

check();
