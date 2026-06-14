const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/multer.config");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");
const uploadCloudinary = require("../middleware/uploadCloudinary");

const upload = multer({ storage });

router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, upload.single("avatar"), uploadCloudinary, userController.updateProfile);
router.put("/change-password", protect, userController.changePassword);

module.exports = router;
