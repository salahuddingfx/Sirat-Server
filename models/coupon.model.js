const mongoose = require("mongoose");
const crypto = require("crypto");

const CouponSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  code: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage", required: true },
  discountValue: { type: Number, required: true },
  minPurchase: { type: Number, default: 0, required: true },
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Coupon", CouponSchema);
