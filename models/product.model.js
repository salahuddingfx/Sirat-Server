const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    images: [{ type: String }], // Array of Cloudinary URLs
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ["Live", "Alert", "Draft"], default: "Live" },
    weight: { type: Number, default: 0.35 }, // Weight in kg for shipping calculation
    slug: { type: String, unique: true },
    rating: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    variants: [
      {
        label: { type: String, required: true },
        priceDelta: { type: Number, default: 0 },
        inStock: { type: Boolean, default: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
