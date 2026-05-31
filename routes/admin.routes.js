const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { protect, admin } = require("../middleware/auth.middleware");

// All routes are protected and admin only
router.use(protect, admin);

router.get("/stats", adminController.getDashboardStats);
router.get("/orders", adminController.getAllOrders);
router.patch("/orders/:id/status", adminController.updateOrderStatus);

module.exports = router;
