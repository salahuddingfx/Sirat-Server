const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/multer.config");
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

const upload = multer({ storage });

router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, upload.single("avatar"), userController.updateProfile);

module.exports = router;
