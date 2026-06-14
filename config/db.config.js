const mongoose = require("mongoose");

// Pre-register models to ensure they are loaded in mongoose
require("../models/user.model");
require("../models/product.model");
require("../models/category.model");
require("../models/order.model");
require("../models/coupon.model");
require("../models/review.model");
require("../models/wishlist.model");
require("../models/cart.model");
require("../models/contact.model");
require("../models/counter.model");
require("../models/event.model");
require("../models/visitor.model");
require("../models/passwordResetToken.model");
require("../models/heroSlide.model");
require("../models/teamMember.model");
require("../models/flashSale.model");
require("../models/settings.model");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is missing.");
    }
    await mongoose.connect(mongoUri);
    console.log("  \x1b[1;33m» DATABASE:\x1b[0m   \x1b[1;32mConnected successfully (Mongoose + MongoDB)\x1b[0m");
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
