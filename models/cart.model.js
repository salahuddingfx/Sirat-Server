const mongoose = require("mongoose");
const crypto = require("crypto");

const CartSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, required: true, unique: true, ref: "User" },
  items: { type: String, default: "[]" },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: false, updatedAt: true },
  _id: false
});

module.exports = mongoose.model("Cart", CartSchema);
