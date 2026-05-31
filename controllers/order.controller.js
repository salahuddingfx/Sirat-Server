const orderService = require("../services/order.services");

const placeOrder = async (req, res) => {
  try {
    const orderData = req.body;
    // If user is logged in, attach their ID
    if (req.user) {
      orderData.user = req.user.id;
    }
    const order = await orderService.createOrder(orderData);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrders({ user: req.user.id });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    
    // Check if it's their order or if they are admin
    if (req.user.role !== 'admin' && order.user?.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrder,
};
