const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isLoggedIn: { type: Boolean, default: false },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    country: { type: String, default: "Unknown" },
    countryCode: { type: String, default: "" },
    city: { type: String, default: "Unknown" },
    region: { type: String, default: "" },
    timezone: { type: String, default: "" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

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

    lastSeen: { type: Date, default: Date.now, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

visitorSchema.index({ createdAt: -1 });
visitorSchema.index({ country: 1 });
visitorSchema.index({ city: 1 });

visitorSchema.statics.markInactive = function (thresholdMs = 30 * 60 * 1000) {
  const cutoff = new Date(Date.now() - thresholdMs);
  return this.updateMany(
    { isActive: true, lastSeen: { $lt: cutoff } },
    { $set: { isActive: false } }
  );
};

module.exports = mongoose.model("Visitor", visitorSchema);
