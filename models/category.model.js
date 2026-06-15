const mongoose = require("mongoose");
const crypto = require("crypto");

const CategorySchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true, unique: true },
  image: { type: String, default: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600" },
  featured: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Category", CategorySchema);
