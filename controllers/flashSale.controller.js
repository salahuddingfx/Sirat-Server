const flashSaleService = require("../service/flashSale.service");
const cache = require("../config/cache.config");

const getActiveFlashSale = async (req, res) => {
  try {
    const sale = await cache.getOrSet(
      cache.buildKey("flash-sale", "active"),
      () => flashSaleService.getActiveFlashSale(),
      60
    );
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetFlashSale = async (req, res) => {
  try {
    const sale = await cache.getOrSet(
      cache.buildKey("flash-sale", "current"),
      () => flashSaleService.getFlashSale(),
      30
    );
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminUpsertFlashSale = async (req, res) => {
  try {
    const sale = await flashSaleService.upsertFlashSale(req.body);
    cache.invalidateNamespace("flash-sale");
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminToggleFlashSale = async (req, res) => {
  try {
    const sale = await flashSaleService.toggleFlashSale();
    if (!sale) return res.status(404).json({ success: false, message: "No flash sale found" });
    cache.invalidateNamespace("flash-sale");
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getActiveFlashSale, adminGetFlashSale, adminUpsertFlashSale, adminToggleFlashSale };
