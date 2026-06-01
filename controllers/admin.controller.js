const orderService = require("../service/order.service");
const productService = require("../service/product.service");
const User = require("../models/user.model");
const { sendStatusUpdateEmail } = require("../service/mail.service");

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
        
        // Notify customer in background
        (async () => {
            try {
                await sendStatusUpdateEmail(order);
            } catch (err) {
                console.error("Status update email failed:", err);
            }
        })();

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

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  updateUserRole,
  deleteUser,
};
