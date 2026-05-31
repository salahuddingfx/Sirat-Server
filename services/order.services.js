const Order = require("../models/order.model");

const createOrder = async (orderData) => {
  // Generate unique order ID
  const orderCount = await Order.countDocuments();
  const orderId = `SRT-${1000 + orderCount + 1}`;
  
  const order = await Order.create({ ...orderData, orderId });
  return order;
};

const getOrders = async (query = {}) => {
  return await Order.find(query).populate("items.product").sort({ createdAt: -1 });
};

const getOrderById = async (id) => {
  return await Order.findById(id).populate("items.product");
};

const updateOrderStatus = async (id, status) => {
  return await Order.findByIdAndUpdate(id, { status }, { new: true });
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
