const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { protect } = require("../middleware/auth.middleware");
const env = require("../config/env.config");

// Guest and User can place orders
router.post("/", (req, res, next) => {
    // Optional auth: if token is present, decode it but don't require it
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
        require("jsonwebtoken").verify(token, env.jwtSecret, (err, decoded) => {
            if (!err) req.user = decoded;
            next();
        });
    } else {
        next();
    }
}, orderController.placeOrder);

// Authenticated user orders
router.get("/my-orders", protect, orderController.getMyOrders);
router.get("/:id", protect, orderController.getOrder);

module.exports = router;
