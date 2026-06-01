const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { protect, admin } = require("../middleware/auth.middleware");
const multer = require("multer");
const { storage } = require("../config/cloudinary.config");

const upload = multer({ storage });

router.get("/", settingsController.getSettings);
router.put("/", protect, admin, upload.single("logo"), settingsController.updateSettings);

module.exports = router;
