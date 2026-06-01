const express = require("express");
const router = express.Router();
const heroController = require("../controllers/hero.controller");

router.get("/", heroController.getHeroSlides);

module.exports = router;
