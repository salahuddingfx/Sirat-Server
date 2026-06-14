const mongoose = require("mongoose");
const crypto = require("crypto");

const ReviewSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, ref: "User" },
  name: { type: String, required: true },
  productId: { type: String, required: true, ref: "Product" },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  isApproved: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Review", ReviewSchema);
