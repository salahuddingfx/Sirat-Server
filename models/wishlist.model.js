const mongoose = require("mongoose");
const crypto = require("crypto");

const WishlistSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, required: true, ref: "User" },
  productId: { type: String, required: true, ref: "Product" },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  _id: false
});

module.exports = mongoose.model("Wishlist", WishlistSchema);
