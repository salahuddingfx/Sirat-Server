const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "navigation",
        "engagement",
        "commerce",
        "auth",
        "search",
        "form",
        "social",
        "error",
      ],
      default: "engagement",
      index: true,
    },

    sessionId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    isLoggedIn: { type: Boolean, default: false },

    page: { type: String, default: "" },
    path: { type: String, default: "" },

    label: { type: String, default: "" },
    value: { type: Number, default: null },
    currency: { type: String, default: "" },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    ip: { type: String, default: "" },
    country: { type: String, default: "Unknown" },
    city: { type: String, default: "Unknown" },
    device: { type: String, default: "desktop" },
    browser: { type: String, default: "Unknown" },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

eventSchema.index({ createdAt: -1 });
eventSchema.index({ type: 1, timestamp: -1 });
eventSchema.index({ sessionId: 1, timestamp: -1 });

module.exports = mongoose.model("Event", eventSchema);
