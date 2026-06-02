const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");

router.get("/overview", analyticsController.getOverview);
router.get("/timeline", analyticsController.getTimeline);
router.get("/live", analyticsController.getLiveVisitors);
router.get("/visitors", analyticsController.getRecentVisitors);
router.get("/events", analyticsController.getRecentEvents);
router.get("/actions", analyticsController.getActions);
router.get("/sessions", analyticsController.getSessions);

module.exports = router;
