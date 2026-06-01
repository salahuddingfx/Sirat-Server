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
      new mongoose.Schema({
        label: { type: String, required: true },
        priceDelta: { type: Number, default: 0 },
        inStock: { type: Boolean, default: true }
      }, {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        id: true // This automatically maps _id to id for subdocs if configured
      })
    ]
  },
  { timestamps: true }
);

// Virtual for id
productSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Virtual for primary image
productSchema.virtual("image").get(function () {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Pre-save hook to generate slug and default variants
productSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  }
  
  // Add default variant if empty
  if (!this.variants || this.variants.length === 0) {
    this.variants.push({
      label: "M",
      priceDelta: 0,
      inStock: true
    });
  }
  next();
});

// Since variants is now a schema with its own virtuals, we need to handle it.
// Actually, Mongoose subdocs usually handle 'id' virtual automatically if 'id: true' is set.
// But let's be explicit if needed.

// Ensure virtuals are serialized
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
