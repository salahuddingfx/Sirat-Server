const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletter.controller");

router.post("/subscribe", newsletterController.subscribeNewsletter);

module.exports = router;
