const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloudinary.config");
const productController = require("../controllers/product.controller");
// const { protect, admin } = require("../middleware/auth.middleware");

const upload = multer({ storage });

router.get("/", productController.getProducts);
router.get("/:id", productController.getProduct);

// Protected Admin Routes
router.post("/", upload.array("images", 5), productController.createProduct);
router.put("/:id", upload.array("images", 5), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;
