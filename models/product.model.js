const mongoose = require("mongoose");
const crypto = require("crypto");

const VariantSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  label: { type: String, required: true },
  priceDelta: { type: Number, default: 0, required: true },
  stock: { type: Number, default: 0, required: true }
});

const ProductSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  costPrice: { type: Number, default: 0, required: true },
  packagingCost: { type: Number, default: 0, required: true },
  managementCost: { type: Number, default: 0, required: true },
  otherCost: { type: Number, default: 0, required: true },
  stock: { type: Number, default: 0, required: true },
  status: { type: String, enum: ["Live", "Alert", "Draft"], default: "Live", required: true },
  weight: { type: Number, default: 0.35, required: true },
  slug: { type: String, required: true, unique: true },
  rating: { type: Number, default: 0, required: true },
  featured: { type: Boolean, default: false, required: true },
  categoryId: { type: String, required: true, ref: "Category" },
  images: [{ type: String }],
  variants: [VariantSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Product", ProductSchema);
