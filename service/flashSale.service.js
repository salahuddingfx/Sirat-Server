const FlashSale = require("../models/flashSale.model");

const getActiveFlashSale = async () => {
  const sale = await FlashSale.findOne({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  }).populate("products");

  if (!sale) return null;

  const remaining = Math.max(0, Math.floor((new Date(sale.endDate).getTime() - Date.now()) / 1000));
  return { ...sale.toObject(), remainingSeconds: remaining };
};

const getFlashSale = async () => {
  return await FlashSale.findOne().sort({ createdAt: -1 });
};

const upsertFlashSale = async (data) => {
  let sale = await FlashSale.findOne();
  if (sale) {
    Object.assign(sale, data);
    return await sale.save();
  }
  return await FlashSale.create(data);
};

const toggleFlashSale = async () => {
  let sale = await FlashSale.findOne();
  if (!sale) return null;
  sale.isActive = !sale.isActive;
  return await sale.save();
};

module.exports = { getActiveFlashSale, getFlashSale, upsertFlashSale, toggleFlashSale };
