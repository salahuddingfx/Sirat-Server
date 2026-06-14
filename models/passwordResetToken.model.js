const mongoose = require("mongoose");
const crypto = require("crypto");

const PasswordResetTokenSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  _id: false
});

module.exports = mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
