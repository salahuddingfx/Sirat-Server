const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { protect, admin } = require("../middleware/auth.middleware");

// All routes are protected and admin only
router.use(protect, admin);

router.get("/stats", adminController.getDashboardStats);
router.get("/orders", adminController.getAllOrders);
router.patch("/orders/:id/status", adminController.updateOrderStatus);

// Hero Slider Management
const heroController = require("../controllers/hero.controller");
router.get("/hero", heroController.adminGetAllSlides);
router.post("/hero", heroController.adminCreateSlide);
router.put("/hero/:id", heroController.adminUpdateSlide);
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

// Flash Sale Management
const flashSaleController = require("../controllers/flashSale.controller");
router.get("/flash-sale", flashSaleController.adminGetFlashSale);
router.put("/flash-sale", flashSaleController.adminUpsertFlashSale);
router.patch("/flash-sale/toggle", flashSaleController.adminToggleFlashSale);

// User Management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/role", adminController.updateUserRole);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
