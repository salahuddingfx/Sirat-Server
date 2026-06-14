const mongoose = require("mongoose");
const crypto = require("crypto");

const TeamMemberSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true },
  role: { type: String, required: true },
  bio: { type: String },
  avatar: { type: String },
  twitter: { type: String, default: "", required: true },
  linkedin: { type: String, default: "", required: true },
  github: { type: String, default: "", required: true },
  instagram: { type: String, default: "", required: true },
  facebook: { type: String, default: "", required: true },
  website: { type: String, default: "", required: true },
  order: { type: Number, default: 0, required: true },
  isActive: { type: Boolean, default: true, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  _id: false
});

module.exports = mongoose.model("TeamMember", TeamMemberSchema);
