const express = require("express");
const router = express.Router();
const trackController = require("../controllers/track.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/session", trackController.trackSession);
router.post("/pageview", trackController.trackPageview);
router.post("/event", trackController.trackEvent);
router.post("/batch", trackController.trackBatch);

module.exports = router;
