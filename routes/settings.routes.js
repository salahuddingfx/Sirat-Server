const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { protect, admin } = require("../middleware/auth.middleware");

router.get("/", settingsController.getSettings);
router.put("/", protect, admin, settingsController.updateSettings);

module.exports = router;
