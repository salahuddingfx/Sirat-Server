const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", cartController.getCart);
router.put("/", cartController.saveCart);
router.delete("/", cartController.clearCart);

module.exports = router;
