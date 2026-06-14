const mongoose = require("mongoose");
const crypto = require("crypto");

const FlashSaleSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  isActive: { type: Boolean, default: false, required: true },
  title: { type: String, default: "Flash Sale", required: true },
  discountPercent: { type: Number, default: 0, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  countdownSeconds: { type: Number, default: 86400, required: true },
  products: [{ type: String, ref: "Product" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("FlashSale", FlashSaleSchema);
