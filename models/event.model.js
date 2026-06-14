const mongoose = require("mongoose");
const crypto = require("crypto");

const EventSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  type: { type: String, required: true },
  category: { type: String, default: "engagement", required: true },
  sessionId: { type: String, required: true },
  userId: { type: String },
  isLoggedIn: { type: Boolean, default: false, required: true },
  page: { type: String, default: "", required: true },
  path: { type: String, default: "", required: true },
  label: { type: String, default: "", required: true },
  value: { type: Number },
  currency: { type: String, default: "", required: true },
  metadata: { type: String }, // JSON stringified object
  ip: { type: String, default: "", required: true },
  country: { type: String, default: "", required: true },
  city: { type: String, default: "", required: true },
  device: { type: String, default: "desktop", required: true },
  browser: { type: String, default: "Unknown", required: true },
  timestamp: { type: Date, default: Date.now, required: true }
}, {
  timestamps: false,
  _id: false
});

module.exports = mongoose.model("Event", EventSchema);
