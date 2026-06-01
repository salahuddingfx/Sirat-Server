const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true }, // Cloudinary image URL
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

categorySchema.virtual("id").get(function () {
  return this._id.toHexString();
});

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Category", categorySchema);
