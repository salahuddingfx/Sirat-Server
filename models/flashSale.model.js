const mongoose = require("mongoose");

const flashSaleSchema = new mongoose.Schema(
  {
    isActive: { type: Boolean, default: false },
    title: { type: String, default: "Flash Sale" },
    discountPercent: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    countdownSeconds: { type: Number, default: 86400 },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("FlashSale", flashSaleSchema);
