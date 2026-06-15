const mongoose = require("mongoose");
const crypto = require("crypto");

const VisitorSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String },
  isLoggedIn: { type: Boolean, default: false },
  ip: { type: String, default: "" },
  userAgent: { type: String, required: true },
  country: { type: String, default: "Unknown" },
  countryCode: { type: String, default: "" },
  city: { type: String, default: "Unknown" },
  region: { type: String, default: "" },
  timezone: { type: String, default: "" },
  latitude: { type: Number },
  longitude: { type: Number },
  browser: { type: String, default: "Unknown" },
  browserVersion: { type: String, default: "" },
  os: { type: String, default: "Unknown" },
  osVersion: { type: String, default: "" },
  device: { type: String, default: "desktop" },
  isMobile: { type: Boolean, default: false },
  isBot: { type: Boolean, default: false },
  referrer: { type: String, default: "" },
  referrerHost: { type: String, default: "" },
  landingPage: { type: String, default: "" },
  screenResolution: { type: String, default: "" },
  language: { type: String, default: "" },
  pagesViewed: { type: Number, default: 1 },
  eventsCount: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  lastSeen: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Visitor", VisitorSchema);
