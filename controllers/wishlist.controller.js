const wishlistService = require("../service/wishlist.service");

const getWishlist = async (req, res) => {
  try {
    const items = await wishlistService.getWishlist(req.user.id);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: "productId is required." });
    const result = await wishlistService.addToWishlist(req.user.id, productId);
    res.status(200).json({ success: true, message: result.message, id: result.id });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await wishlistService.removeFromWishlist(req.user.id, productId);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const wishlisted = await wishlistService.isWishlisted(req.user.id, productId);
    res.status(200).json({ success: true, data: { wishlisted } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkWishlist };
