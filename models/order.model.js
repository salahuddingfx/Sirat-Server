const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Null for guest checkouts
    guestInfo: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        variant: { type: String },
        price: { type: Number, required: true },
      },
    ],
    shippingCharge: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cod", "bkash", "nagad"], default: "cod" },
    paymentDetails: {
      senderNumber: { type: String },
      txId: { type: String },
    },
    status: {
      type: String,
      enum: ["received", "confirmed", "packed", "shipped", "delivered", "cancelled"],
      default: "received",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
