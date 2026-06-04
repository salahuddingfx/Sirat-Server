const cartService = require("../service/cart.service");

const getCart = async (req, res) => {
  try {
    const result = await cartService.getCart(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveCart = async (req, res) => {
  try {
    const { items } = req.body;
    const result = await cartService.saveCart(req.user.id, items);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    const result = await cartService.clearCart(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCart, saveCart, clearCart };
