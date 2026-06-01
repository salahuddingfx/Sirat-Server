const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);

module.exports = router;
