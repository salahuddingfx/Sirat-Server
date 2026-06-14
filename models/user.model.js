const mongoose = require("mongoose");
const crypto = require("crypto");

const AddressSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  country: { type: String, default: "Bangladesh" },
  isDefault: { type: Boolean, default: false }
});

const UserSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user", required: true },
  avatar: { type: String },
  addresses: [AddressSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("User", UserSchema);
