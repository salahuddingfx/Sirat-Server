const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/multer.config");
const productController = require("../controllers/product.controller");
const { protect, admin } = require("../middleware/auth.middleware");
const uploadCloudinary = require("../middleware/uploadCloudinary");

const upload = multer({ storage });

router.get("/", productController.getProducts);
router.get("/featured", productController.getFeaturedProducts);
router.get("/best-seller", productController.getBestSeller);
router.get("/:id", productController.getProduct);

// Protected Admin Routes
router.post("/", protect, admin, upload.array("images", 5), uploadCloudinary, productController.createProduct);
router.put("/:id", protect, admin, upload.array("images", 5), uploadCloudinary, productController.updateProduct);
router.delete("/:id", protect, admin, productController.deleteProduct);

module.exports = router;
