const express = require("express");
const router = express.Router();
const passwordController = require("../controllers/password.controller");

router.post("/forgot", passwordController.requestReset);
router.post("/verify-otp", passwordController.verifyOtp);
router.post("/reset", passwordController.resetPassword);

module.exports = router;
