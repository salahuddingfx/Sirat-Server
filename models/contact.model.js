const mongoose = require("mongoose");
const crypto = require("crypto");

const ContactSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Contact", ContactSchema);
