const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const { protect } = require("../middleware/auth.middleware");
const env = require("../config/env.config");

// Optional auth for creating reviews
router.post("/", (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
        require("jsonwebtoken").verify(token, env.jwtSecret, (err, decoded) => {
            if (!err) req.user = decoded;
            next();
        });
    } else {
        next();
    }
}, reviewController.createReview);

router.get("/product/:productId", reviewController.getProductReviews);
router.get("/", reviewController.getAllApprovedReviews);

module.exports = router;
