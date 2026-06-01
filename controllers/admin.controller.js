const orderService = require("../services/order.services");
const productService = require("../services/product.services");
const User = require("../models/user.model");

const getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await orderService.getOrders();
    const totalProducts = await productService.getAllProducts();
    const totalUsers = await User.countDocuments({ role: "user" });
    
    const revenue = totalOrders.reduce((acc, order) => acc + order.totalAmount, 0);
    const lowStock = totalProducts.filter(p => p.stock < 10).length;

    res.status(200).json({
      success: true,
      data: {
        revenue,
        orderCount: totalOrders.length,
        userCount: totalUsers,
        lowStockCount: lowStock,
        recentOrders: totalOrders.slice(0, 5),
        recentProducts: totalProducts.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await orderService.getOrders();
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const updateOrderStatus = async (req, res) => {
    try {
        const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus
};
