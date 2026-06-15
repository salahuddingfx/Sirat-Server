const { connectDB } = require("../config/db.config");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const Category = require("../models/category.model");
const mongoose = require("mongoose");

async function check() {
  try {
    console.log("Checking database connection...");
    await connectDB();
    console.log("Successfully connected to MongoDB via Mongoose!");

    const pCount = await Product.countDocuments();
    const uCount = await User.countDocuments();
    const cCount = await Category.countDocuments();

    console.log("\x1b[32mStats:\x1b[0m");
    console.log(`- Products: ${pCount}`);
    console.log(`- Users: ${uCount}`);
    console.log(`- Categories: ${cCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("\x1b[31mDatabase check failed:\x1b[0m", err.message);
    process.exit(1);
  }
}

check();
