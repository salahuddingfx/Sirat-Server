const flashSaleService = require("../service/flashSale.service");

const getActiveFlashSale = async (req, res) => {
  try {
    const sale = await flashSaleService.getActiveFlashSale();
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetFlashSale = async (req, res) => {
  try {
    const sale = await flashSaleService.getFlashSale();
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminUpsertFlashSale = async (req, res) => {
  try {
    const sale = await flashSaleService.upsertFlashSale(req.body);
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminToggleFlashSale = async (req, res) => {
  try {
    const sale = await flashSaleService.toggleFlashSale();
    if (!sale) return res.status(404).json({ success: false, message: "No flash sale found" });
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getActiveFlashSale, adminGetFlashSale, adminUpsertFlashSale, adminToggleFlashSale };
