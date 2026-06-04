const analyticsService = require("../service/analytics.service");
const { extractRequestContext } = require("../middleware/analytics.middleware");

const VALID_EVENT_TYPES = new Set([
  "pageview",
  "session_start",
  "session_end",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "checkout_start",
  "checkout_step",
  "purchase",
  "search",
  "filter",
  "category_view",
  "signup",
  "login",
  "logout",
  "newsletter_subscribe",
  "contact_submit",
  "order_track",
  "wishlist_add",
  "share",
  "review_submit",
  "cta_click",
  "outbound_click",
  "scroll_milestone",
  "error",
  "apply_promo",
  "clear_cart",
]);

const VALID_CATEGORIES = new Set([
  "navigation",
  "engagement",
  "commerce",
  "auth",
  "search",
  "form",
  "social",
  "error",
]);

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[Track]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const trackSession = safe(async (req, res) => {
  const ctx = extractRequestContext(req);
  const sessionId =
    (req.body && req.body.sessionId) ||
    (req.headers["x-session-id"] && String(req.headers["x-session-id"])) ||
    "v_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);

  const visitor = await analyticsService.recordVisitor({
    ...ctx,
    sessionId,
    userId: req.user?.id || req.user?._id || null,
    isLoggedIn: !!req.user,
    landingPage: req.body?.landingPage || req.originalUrl || "/",
  });

  res.set("X-Session-Id", sessionId);
  res.status(200).json({
    success: true,
    data: {
      sessionId,
      visitorId: visitor?.id || null,
      country: ctx.country,
      city: ctx.city,
      device: ctx.device,
      browser: ctx.browser,
    },
  });
});

const trackPageview = safe(async (req, res) => {
  const ctx = extractRequestContext(req);
  const sessionId =
    req.body?.sessionId ||
    (req.headers["x-session-id"] && String(req.headers["x-session-id"]));
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "sessionId required" });
  }

  const visitor = await analyticsService.recordVisitor({
    ...ctx,
    sessionId,
    userId: req.user?.id || req.user?._id || null,
    isLoggedIn: !!req.user,
    landingPage: req.body?.path || req.body?.url || "/",
  });

  if (req.body?.type === "pageview" || !req.body?.type) {
    await analyticsService.recordEvent({
      type: "pageview",
      category: "navigation",
      sessionId,
      userId: req.user?.id || req.user?._id || null,
      isLoggedIn: !!req.user,
      page: req.body?.title || "",
      path: req.body?.path || "",
      ip: ctx.ip,
      country: ctx.country,
      city: ctx.city,
      device: ctx.device,
      browser: ctx.browser,
    });
  }

  res.status(200).json({ success: true });
});

const trackEvent = safe(async (req, res) => {
  const ctx = extractRequestContext(req);
  const body = req.body || {};
  const type = String(body.type || "").toLowerCase();
  if (!type) {
    return res.status(400).json({ success: false, message: "type required" });
  }
  if (!VALID_EVENT_TYPES.has(type)) {
    return res.status(400).json({ success: false, message: `Unknown event type: ${type}` });
  }
  const sessionId = body.sessionId || (req.headers["x-session-id"] && String(req.headers["x-session-id"]));
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "sessionId required" });
  }

  const category = VALID_CATEGORIES.has(body.category) ? body.category : "engagement";

  await analyticsService.recordEvent({
    type,
    category,
    sessionId,
    userId: req.user?.id || req.user?._id || null,
    isLoggedIn: !!req.user,
    page: body.page || "",
    path: body.path || "",
    label: body.label || "",
    value: typeof body.value === "number" ? body.value : null,
    currency: body.currency || "",
    metadata: body.metadata || {},
    ip: ctx.ip,
    country: ctx.country,
    city: ctx.city,
    device: ctx.device,
    browser: ctx.browser,
  });

  await analyticsService.incrementVisitorEvents(sessionId);

  if (type === "session_end") {
    await analyticsService.endVisitorSession(sessionId, body.durationMs || 0);
  } else {
    await analyticsService.updateVisitorActivity(sessionId, {
      lastSeen: new Date(),
      isActive: true,
    });
  }

  res.status(200).json({ success: true });
});

const trackBatch = safe(async (req, res) => {
  const ctx = extractRequestContext(req);
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  const sessionId =
    req.body?.sessionId ||
    (req.headers["x-session-id"] && String(req.headers["x-session-id"]));
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "sessionId required" });
  }
  if (events.length === 0) {
    return res.status(200).json({ success: true, count: 0 });
  }
  if (events.length > 50) {
    return res.status(400).json({ success: false, message: "Max 50 events per batch" });
  }

  const recorded = [];
  for (const ev of events) {
    const type = String(ev.type || "").toLowerCase();
    if (!type || !VALID_EVENT_TYPES.has(type)) continue;
    const category = VALID_CATEGORIES.has(ev.category) ? ev.category : "engagement";
    await analyticsService.recordEvent({
      type,
      category,
      sessionId,
      userId: req.user?.id || req.user?._id || null,
      isLoggedIn: !!req.user,
      page: ev.page || "",
      path: ev.path || "",
      label: ev.label || "",
      value: typeof ev.value === "number" ? ev.value : null,
      currency: ev.currency || "",
      metadata: ev.metadata || {},
      ip: ctx.ip,
      country: ctx.country,
      city: ctx.city,
      device: ctx.device,
      browser: ctx.browser,
    });
    recorded.push(type);
  }
  await analyticsService.incrementVisitorEvents(sessionId);

  res.status(200).json({ success: true, count: recorded.length });
});

module.exports = {
  trackSession,
  trackPageview,
  trackEvent,
  trackBatch,
  VALID_EVENT_TYPES,
};
