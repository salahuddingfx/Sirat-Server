const analyticsService = require("../service/analytics.service");
const cache = require("../config/cache.config");

const CACHE_TTL = 30;

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[Analytics]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOverview = safe(async (req, res) => {
  const days = Math.min(180, Math.max(1, parseInt(req.query.days, 10) || 30));
  const data = await cache.getOrSet(
    cache.buildKey("analytics", "overview", `d${days}`),
    () => analyticsService.getOverview(days),
    CACHE_TTL
  );
  res.status(200).json({ success: true, data });
});

const getTimeline = safe(async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
  const data = await cache.getOrSet(
    cache.buildKey("analytics", "timeline", `d${days}`),
    () => analyticsService.getTimeline(days),
    CACHE_TTL
  );
  res.status(200).json({ success: true, data });
});

const getLiveVisitors = safe(async (req, res) => {
  await analyticsService.markInactiveVisitors();
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const data = await analyticsService.getLiveVisitors(limit);
  res.status(200).json({ success: true, data });
});

const getRecentVisitors = safe(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const data = await analyticsService.getRecentVisitors({
    page,
    limit,
    country: req.query.country || undefined,
    device: req.query.device || undefined,
    search: req.query.search || undefined,
  });
  res.status(200).json({ success: true, data });
});

const getRecentEvents = safe(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
  const data = await analyticsService.getRecentEvents({
    page,
    limit,
    type: req.query.type || undefined,
    category: req.query.category || undefined,
    sessionId: req.query.sessionId || undefined,
  });
  res.status(200).json({ success: true, data });
});

const getActions = safe(async (req, res) => {
  const days = Math.min(180, Math.max(1, parseInt(req.query.days, 10) || 30));
  const data = await cache.getOrSet(
    cache.buildKey("analytics", "actions", `d${days}`),
    () => analyticsService.getActions(days),
    CACHE_TTL
  );
  res.status(200).json({ success: true, data });
});

const getSessions = safe(async (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const data = await analyticsService.getSessions(limit);
  res.status(200).json({ success: true, data });
});

module.exports = {
  getOverview,
  getTimeline,
  getLiveVisitors,
  getRecentVisitors,
  getRecentEvents,
  getActions,
  getSessions,
};
