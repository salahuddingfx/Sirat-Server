const mongoose = require("mongoose");
const crypto = require("crypto");

const CategorySchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true, unique: true },
  image: { type: String, required: true },
  featured: { type: Boolean, default: false, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("Category", CategorySchema);
