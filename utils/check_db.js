const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }));
    const products = await Product.find({}, "name stock slug");
    console.log("Database Products stock:");
    console.log(products);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
check();
