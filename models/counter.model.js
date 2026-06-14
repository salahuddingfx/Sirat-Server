const mongoose = require("mongoose");
const crypto = require("crypto");

const CounterSchema = new mongoose.Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0, required: true }
}, {
  _id: false
});

module.exports = mongoose.model("Counter", CounterSchema);
