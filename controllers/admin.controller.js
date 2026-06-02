const orderService = require("../service/order.service");
const productService = require("../service/product.service");
const User = require("../models/user.model");
const { sendStatusUpdateEmail } = require("../service/mail.service");
const cache = require("../config/cache.config");

const getDashboardStats = async (req, res) => {
  try {
    const stats = await cache.getOrSet(
      cache.buildKey("dashboard", "stats"),
      async () => {
        const totalOrders = await orderService.getOrders();
        const totalProducts = await productService.getAllProducts();
        const totalUsers = await User.countDocuments({ role: "user" });

        const revenue = totalOrders.reduce((acc, order) => acc + order.totalAmount, 0);
        const lowStock = totalProducts.filter(p => p.stock < 10).length;

        return {
          revenue,
          orderCount: totalOrders.length,
          userCount: totalUsers,
          lowStockCount: lowStock,
          recentOrders: totalOrders.slice(0, 5),
          recentProducts: totalProducts.slice(0, 5)
        };
      },
      30
    );
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await cache.getOrSet(
          cache.buildKey("orders", "all"),
          () => orderService.getOrders(),
          15
        );
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

const updateOrderStatus = async (req, res) => {
    try {
        const order = await orderService.updateOrderStatus(req.params.id, req.body.status);

        // Notify customer in background
        (async () => {
            try {
                await sendStatusUpdateEmail(order);
            } catch (err) {
                console.error("Status update email failed:", err);
            }
        })();

        cache.invalidateNamespace("orders");
        cache.invalidateNamespace("dashboard");
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const order = await orderService.updatePaymentStatus(req.params.id, paymentStatus);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateOrderDetails = async (req, res) => {
  try {
    const updates = req.body;
    const order = await orderService.updateOrderDetails(req.params.id, updates);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const result = await orderService.deleteOrder(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderDetails,
  deleteOrder,
  getAllUsers,
  updateUserRole,
  deleteUser,
};
