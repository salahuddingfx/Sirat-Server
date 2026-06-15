const FlashSale = require("../models/flashSale.model");
const Product = require("../models/product.model");

// Format product images mapping for frontend compatibility
const formatProduct = (p) => {
  if (!p) return null;
  const obj = p.toObject ? p.toObject() : p;
  obj.id = obj._id;
  if (obj.categoryId && typeof obj.categoryId === "object") {
    obj.category = {
      ...obj.categoryId,
      id: obj.categoryId._id,
    };
    obj.categoryId = obj.categoryId._id;
  }
  if (obj.variants) {
    obj.variants = obj.variants.map((v) => ({ ...v, id: v._id }));
  }
  if (obj.images) {
    obj.images = obj.images.map((img) => typeof img === "string" ? { url: img } : img);
  }
  return obj;
};

const formatFlashSale = (sale) => {
  if (!sale) return null;
  const obj = sale.toObject ? sale.toObject() : sale;
  obj.id = obj._id;
  if (obj.products) {
    obj.products = obj.products.map(formatProduct).filter(Boolean);
  }
  return obj;
};

const getActiveFlashSale = async () => {
  const sale = await FlashSale.findOne({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  })
  .populate({
    path: "products",
    populate: { path: "categoryId" }
  })
  .sort({ createdAt: -1 });

  if (!sale) return null;

  const saleToReturn = formatFlashSale(sale);
  const remaining = Math.max(0, Math.floor((new Date(sale.endDate).getTime() - Date.now()) / 1000));
  return { ...saleToReturn, remainingSeconds: remaining };
};

const getFlashSale = async () => {
  const sale = await FlashSale.findOne()
    .populate({
      path: "products",
      populate: { path: "categoryId" }
    })
    .sort({ createdAt: -1 });

  return formatFlashSale(sale);
};

const upsertFlashSale = async (data) => {
  const existingSale = await FlashSale.findOne();

  const { products: productIds, ...rest } = data;
  const restWithDates = { ...rest };
  if (restWithDates.startDate) restWithDates.startDate = new Date(restWithDates.startDate);
  if (restWithDates.endDate) restWithDates.endDate = new Date(restWithDates.endDate);
  if (productIds) restWithDates.products = productIds;

  let sale;
  if (existingSale) {
    sale = await FlashSale.findByIdAndUpdate(
      existingSale._id,
      { $set: restWithDates },
      { new: true }
    );
  } else {
    sale = await FlashSale.create(restWithDates);
  }

  const populated = await FlashSale.findById(sale._id).populate({
    path: "products",
    populate: { path: "categoryId" }
  });

  return formatFlashSale(populated);
};

const toggleFlashSale = async () => {
  const sale = await FlashSale.findOne();
  if (!sale) return null;

  sale.isActive = !sale.isActive;
  await sale.save();

  return formatFlashSale(sale);
};

module.exports = { getActiveFlashSale, getFlashSale, upsertFlashSale, toggleFlashSale };
