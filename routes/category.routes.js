const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloudinary.config");
const categoryController = require("../controllers/category.controller");

const upload = multer({ storage });

router.get("/", categoryController.getCategories);
router.post("/", upload.single("image"), categoryController.createCategory);
router.put("/:id", upload.single("image"), categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
