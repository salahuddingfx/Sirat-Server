const mongoose = require("mongoose");
const crypto = require("crypto");

const EventSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  type: { type: String, required: true },
  category: { type: String, default: "engagement" },
  sessionId: { type: String, required: true },
  userId: { type: String },
  isLoggedIn: { type: Boolean, default: false },
  page: { type: String, default: "" },
  path: { type: String, default: "" },
  label: { type: String, default: "" },
  value: { type: Number },
  currency: { type: String, default: "" },
  metadata: { type: String }, // JSON stringified object
  ip: { type: String, default: "" },
  country: { type: String, default: "" },
  city: { type: String, default: "" },
  device: { type: String, default: "desktop" },
  browser: { type: String, default: "Unknown" },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false,
  _id: false
});

module.exports = mongoose.model("Event", EventSchema);
