const express = require("express");
const router = express.Router();
const flashSaleController = require("../controllers/flashSale.controller");

router.get("/active", flashSaleController.getActiveFlashSale);

module.exports = router;
