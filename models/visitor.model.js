const mongoose = require("mongoose");
const crypto = require("crypto");

const VisitorSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String },
  isLoggedIn: { type: Boolean, default: false, required: true },
  ip: { type: String, default: "", required: true },
  userAgent: { type: String, required: true },
  country: { type: String, default: "Unknown", required: true },
  countryCode: { type: String, default: "", required: true },
  city: { type: String, default: "Unknown", required: true },
  region: { type: String, default: "", required: true },
  timezone: { type: String, default: "", required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  browser: { type: String, default: "Unknown", required: true },
  browserVersion: { type: String, default: "", required: true },
  os: { type: String, default: "Unknown", required: true },
  osVersion: { type: String, default: "", required: true },
  device: { type: String, default: "desktop", required: true },
  isMobile: { type: Boolean, default: false, required: true },
  isBot: { type: Boolean, default: false, required: true },
  referrer: { type: String, default: "", required: true },
  referrerHost: { type: String, default: "", required: true },
  landingPage: { type: String, default: "", required: true },
  screenResolution: { type: String, default: "", required: true },
  language: { type: String, default: "", required: true },
  pagesViewed: { type: Number, default: 1, required: true },
  eventsCount: { type: Number, default: 0, required: true },
  durationMs: { type: Number, default: 0, required: true },
  lastSeen: { type: Date, default: Date.now, required: true },
  isActive: { type: Boolean, default: true, required: true }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Visitor", VisitorSchema);
