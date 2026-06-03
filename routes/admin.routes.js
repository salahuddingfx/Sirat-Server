const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/multer.config");
const { protect, admin } = require("../middleware/auth.middleware");
const upload = multer({ storage });
const heroController = require("../controllers/hero.controller");
const adminController = require("../controllers/admin.controller");
router.get("/hero", heroController.adminGetAllSlides);
router.post("/hero", upload.single("image"), heroController.adminCreateSlide);
router.put("/hero/:id", upload.single("image"), heroController.adminUpdateSlide);
router.delete("/hero/:id", heroController.adminDeleteSlide);

// Review Moderation
const reviewController = require("../controllers/review.controller");
router.get("/reviews", reviewController.adminGetAllReviews);
router.patch("/reviews/:id/approve", reviewController.adminUpdateReviewApproval);
router.delete("/reviews/:id", reviewController.adminDeleteReview);

// Contact Messages
const contactController = require("../controllers/contact.controller");
router.get("/contacts", contactController.adminGetAllContacts);
router.patch("/contacts/:id/read", contactController.adminMarkAsRead);
router.delete("/contacts/:id", contactController.adminDeleteContact);

// Coupon Management
const couponController = require("../controllers/coupon.controller");
router.get("/coupons", couponController.adminGetAllCoupons);
router.post("/coupons", couponController.adminCreateCoupon);
router.put("/coupons/:id", couponController.adminUpdateCoupon);
router.delete("/coupons/:id", couponController.adminDeleteCoupon);

// Payment Approval
router.patch("/orders/:id/payment-status", adminController.updatePaymentStatus);

// Order Status Update
router.patch("/orders/:id/status", adminController.updateOrderStatus);

// List All Orders
router.get("/orders", adminController.getAllOrders);

// Dashboard Stats
router.get("/stats", adminController.getDashboardStats);

// Order Detail Management
router.get("/orders/:id", adminController.getOrderById);
router.patch("/orders/:id/details", adminController.updateOrderDetails);

// Delete Order
router.delete("/orders/:id", adminController.deleteOrder);

// Flash Sale Management
const flashSaleController = require("../controllers/flashSale.controller");
router.get("/flash-sale", flashSaleController.adminGetFlashSale);
router.put("/flash-sale", flashSaleController.adminUpsertFlashSale);
router.patch("/flash-sale/toggle", flashSaleController.adminToggleFlashSale);

// User Management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.deleteUser);

// Cache Management
router.get("/cache/stats", adminController.getCacheStats);
router.post("/cache/flush", adminController.flushCache);

module.exports = router;
