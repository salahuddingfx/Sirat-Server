const Cart = require("../models/cart.model");

const getCart = async (userId) => {
  const found = await Cart.findOne({ userId });
  if (!found) return { items: [] };
  try {
    return { items: JSON.parse(found.items || "[]") };
  } catch {
    return { items: [] };
  }
};

const saveCart = async (userId, items) => {
  const existing = await Cart.findOne({ userId });
  const itemsJson = JSON.stringify(items || []);

  if (existing) {
    existing.items = itemsJson;
    await existing.save();
  } else {
    await Cart.create({
      userId,
      items: itemsJson
    });
  }
  return { items };
};

const clearCart = async (userId) => {
  await Cart.deleteOne({ userId });
  return { items: [] };
};

module.exports = { getCart, saveCart, clearCart };
