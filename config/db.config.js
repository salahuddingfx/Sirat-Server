const mongoose = require("mongoose");
require("./env.config");

// Register global plugin to support both UUID string IDs and legacy MongoDB ObjectIds for all schemas
mongoose.plugin((schema) => {
  const idPath = schema.path("_id");
  if (idPath) {
    const options = idPath.options || {};
    schema.path("_id", {
      ...options,
      type: mongoose.Schema.Types.Mixed
    });
  }

  const castId = (val) => {
    if (typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/)) {
      return new mongoose.Types.ObjectId(val);
    }
    return val;
  };

  const castQueryIds = (query) => {
    if (!query) return;
    if (query._id !== undefined) {
      if (typeof query._id === "object" && query._id !== null) {
        if (query._id.$in && Array.isArray(query._id.$in)) {
          query._id.$in = query._id.$in.map(castId);
        } else if (query._id.$nin && Array.isArray(query._id.$nin)) {
          query._id.$nin = query._id.$nin.map(castId);
        } else if (query._id.$ne !== undefined) {
          query._id.$ne = castId(query._id.$ne);
        } else if (query._id.$eq !== undefined) {
          query._id.$eq = castId(query._id.$eq);
        }
      } else {
        query._id = castId(query._id);
      }
    }
  };

  schema.pre(["find", "findOne", "findOneAndUpdate", "findOneAndDelete", "deleteOne", "deleteMany", "updateOne", "updateMany", "countDocuments"], function() {
    castQueryIds(this.getQuery());
  });
});

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
