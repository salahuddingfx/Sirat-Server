const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");

router.get("/", teamController.getActiveTeam);

module.exports = router;
