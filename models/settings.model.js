const mongoose = require("mongoose");
const crypto = require("crypto");

const SettingsSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  phone: { type: String, default: "+880 1700 000000", required: true },
  email: { type: String, default: "hello@siratclothing.com", required: true },
  address: { type: String, default: "Dhaka, Bangladesh", required: true },
  facebook: { type: String, default: "https://www.facebook.com/sirat2026", required: true },
  instagram: { type: String, default: "https://instagram.com", required: true },
  whatsapp: { type: String, default: "https://wa.me/8801700000000", required: true },
  tagline: { type: String, default: "Purity in Every Step", required: true },
  description: { type: String, default: "", required: true },
  logo: { type: String, default: "", required: true },
  bkashNumber: { type: String, default: "", required: true },
  nagadNumber: { type: String, default: "", required: true },
  rocketNumber: { type: String, default: "", required: true },
  pinterest: { type: String, default: "", required: true },
  youtube: { type: String, default: "", required: true },
  tiktok: { type: String, default: "", required: true },
  twitter: { type: String, default: "", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Settings", SettingsSchema);
