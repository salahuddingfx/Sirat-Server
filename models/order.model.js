const mongoose = require("mongoose");
const crypto = require("crypto");

const OrderItemSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  productId: { type: String, required: true, ref: "Product" },
  quantity: { type: Number, required: true },
  variant: { type: String },
  price: { type: Number, required: true }
});

const OrderSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  orderId: { type: String, required: true, unique: true },
  userId: { type: String, ref: "User" },
  guestName: { type: String },
  guestEmail: { type: String },
  guestPhone: { type: String },
  guestAddress: { type: String },
  guestCity: { type: String },
  guestZipCode: { type: String },
  shippingCharge: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  couponCode: { type: String },
  paymentMethod: { type: String, enum: ["cod", "bkash", "nagad"], default: "cod", required: true },
  senderNumber: { type: String },
  txId: { type: String },
  paymentStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true },
  status: { type: String, enum: ["received", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"], default: "received", required: true },
  items: [OrderItemSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Order", OrderSchema);
