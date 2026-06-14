const mongoose = require("mongoose");
const crypto = require("crypto");

const HeroSlideSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  image: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String },
  description: { type: String },
  actionText: { type: String, default: "Shop Now", required: true },
  link: { type: String, default: "/shop", required: true },
  isActive: { type: Boolean, default: true, required: true },
  order: { type: Number, default: 0, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("HeroSlide", HeroSlideSchema);
