const Visitor = require("../models/visitor.model");
const Event = require("../models/event.model");

const ACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

const getActiveThreshold = () => new Date(Date.now() - ACTIVE_THRESHOLD_MS);

const recordVisitor = async (data) => {
  if (!data || !data.sessionId) return null;
  if (data.isBot) return null;

  const update = {
    $set: {
      sessionId: data.sessionId,
      userId: data.userId || null,
      isLoggedIn: !!data.isLoggedIn,
      ip: data.ip || "",
      userAgent: data.userAgent || "",
      country: data.country || "Unknown",
      countryCode: data.countryCode || "",
      city: data.city || "Unknown",
      region: data.region || "",
      timezone: data.timezone || "",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      browser: data.browser || "Unknown",
      browserVersion: data.browserVersion || "",
      os: data.os || "Unknown",
      osVersion: data.osVersion || "",
      device: data.device || "desktop",
      isMobile: !!data.isMobile,
      isBot: !!data.isBot,
      language: data.language || "",
      referrer: data.referrer || "",
      referrerHost: data.referrerHost || "",
      landingPage: data.landingPage || data.path || "/",
      lastSeen: new Date(),
      isActive: true,
    },
    $inc: { pagesViewed: 1 },
    $setOnInsert: { createdAt: new Date() },
  };

  try {
    return await Visitor.findOneAndUpdate(
      { sessionId: data.sessionId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      return Visitor.findOne({ sessionId: data.sessionId });
    }
    throw err;
  }
};

const updateVisitorActivity = async (sessionId, patch = {}) => {
  if (!sessionId) return null;
  return Visitor.findOneAndUpdate(
    { sessionId },
    {
      $set: { lastSeen: new Date(), isActive: true, ...patch },
    },
    { new: true }
  );
};

const endVisitorSession = async (sessionId, durationMs) => {
  if (!sessionId) return null;
  return Visitor.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        isActive: false,
        lastSeen: new Date(),
        durationMs: durationMs || 0,
      },
    },
    { new: true }
  );
};

const incrementVisitorEvents = async (sessionId) => {
  if (!sessionId) return null;
  return Visitor.findOneAndUpdate(
    { sessionId },
    { $inc: { eventsCount: 1 }, $set: { lastSeen: new Date(), isActive: true } },
    { new: true }
  );
};

const recordEvent = async (data) => {
  if (!data || !data.type || !data.sessionId) return null;
  return Event.create({
    type: data.type,
    category: data.category || "engagement",
    sessionId: data.sessionId,
    userId: data.userId || null,
    isLoggedIn: !!data.isLoggedIn,
    page: data.page || "",
    path: data.path || "",
    label: data.label || "",
    value: typeof data.value === "number" ? data.value : null,
    currency: data.currency || "",
    metadata: data.metadata || {},
    ip: data.ip || "",
    country: data.country || "Unknown",
    city: data.city || "Unknown",
    device: data.device || "desktop",
    browser: data.browser || "Unknown",
    timestamp: new Date(),
  });
};

const markInactiveVisitors = async () => {
  const cutoff = getActiveThreshold();
  return Visitor.updateMany(
    { isActive: true, lastSeen: { $lt: cutoff } },
    { $set: { isActive: false } }
  );
};

const getOverview = async (days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);

  const now = new Date();
  const last5min = new Date(Date.now() - 5 * 60 * 1000);

  const [
    totalVisitors,
    totalPageviews,
    totalEvents,
    uniqueCountries,
    uniqueCities,
    periodVisitors,
    periodPageviewsAgg,
    periodEventsAgg,
    periodUniqueSessions,
    prevPeriodVisitors,
    prevPeriodPageviewsAgg,
    prevPeriodUniqueSessions,
    activeVisitors,
    onlineVisitors,
    topCountries,
    topCities,
    topBrowsers,
    topDevices,
    topReferrers,
    topPages,
    deviceBreakdown,
  ] = await Promise.all([
    Visitor.countDocuments({ isBot: { $ne: true } }),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true } } },
      { $group: { _id: null, total: { $sum: "$pagesViewed" } } },
    ]).then((r) => r[0]?.total || 0),
    Event.countDocuments({}),
    Visitor.distinct("country", { isBot: { $ne: true } }),
    Visitor.distinct("city", { isBot: { $ne: true } }),
    Visitor.countDocuments({ isBot: { $ne: true }, createdAt: { $gte: start } }),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true }, createdAt: { $gte: start } } },
      { $group: { _id: null, total: { $sum: "$pagesViewed" } } },
    ]),
    Event.countDocuments({ timestamp: { $gte: start } }),
    Visitor.distinct("sessionId", { isBot: { $ne: true }, createdAt: { $gte: start } }),
    Visitor.countDocuments({ isBot: { $ne: true }, createdAt: { $gte: prevStart, $lt: start } }),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true }, createdAt: { $gte: prevStart, $lt: start } } },
      { $group: { _id: null, total: { $sum: "$pagesViewed" } } },
    ]),
    Visitor.distinct("sessionId", { isBot: { $ne: true }, createdAt: { $gte: prevStart, $lt: start } }),
    Visitor.countDocuments({ isBot: { $ne: true }, isActive: true, lastSeen: { $gte: getActiveThreshold() } }),
    Visitor.countDocuments({ isBot: { $ne: true }, lastSeen: { $gte: last5min } }),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true } } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true } } },
      { $group: { _id: { country: "$country", city: "$city" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true } } },
      { $group: { _id: "$browser", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true } } },
      { $group: { _id: "$device", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true }, referrerHost: { $ne: "" } } },
      { $group: { _id: "$referrerHost", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true } } },
      { $group: { _id: "$landingPage", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Visitor.aggregate([
      { $match: { isBot: { $ne: true } } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$isMobile", true] }, "mobile", "desktop"] },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const periodPageviews = periodPageviewsAgg[0]?.total || 0;
  const prevPageviews = prevPeriodPageviewsAgg[0]?.total || 0;

  const changePct = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    period: { days, start, end: now },
    totals: {
      visitors: totalVisitors,
      pageviews: totalPageviews,
      events: totalEvents,
      countries: uniqueCountries.length,
      cities: uniqueCities.length,
    },
    periodStats: {
      visitors: periodVisitors,
      pageviews: periodPageviews,
      events: periodEventsAgg,
      uniqueSessions: periodUniqueSessions.length,
    },
    periodChange: {
      visitors: changePct(periodVisitors, prevPeriodVisitors),
      pageviews: changePct(periodPageviews, prevPageviews),
      uniqueSessions: changePct(periodUniqueSessions.length, prevPeriodUniqueSessions.length),
    },
    live: {
      active: activeVisitors,
      online: onlineVisitors,
    },
    topCountries: topCountries.map((c) => ({ country: c._id, count: c.count })),
    topCities: topCities.map((c) => ({
      country: c._id.country,
      city: c._id.city,
      count: c.count,
    })),
    topBrowsers: topBrowsers.map((b) => ({ browser: b._id, count: b.count })),
    topDevices: topDevices.map((d) => ({ device: d._id, count: d.count })),
    topReferrers: topReferrers.map((r) => ({ referrer: r._id, count: r.count })),
    topPages: topPages.map((p) => ({ path: p._id, count: p.count })),
    deviceBreakdown: deviceBreakdown.map((d) => ({ type: d._id, count: d.count })),
  };
};

const getTimeline = async (days = 7) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const visitorsByDay = await Visitor.aggregate([
    { $match: { isBot: { $ne: true }, createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        visitors: { $sum: 1 },
        pageviews: { $sum: "$pagesViewed" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const eventsByDay = await Event.aggregate([
    { $match: { timestamp: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        events: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const eventsByType = await Event.aggregate([
    { $match: { timestamp: { $gte: start } } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 },
  ]);

  return {
    visitorsByDay: visitorsByDay.map((d) => ({
      date: d._id,
      visitors: d.visitors,
      pageviews: d.pageviews,
      events: 0,
    })),
    eventsByDay: eventsByDay.map((d) => ({ date: d._id, events: d.events })),
    eventsByType: eventsByType.map((e) => ({ type: e._id, count: e.count })),
  };
};

const getLiveVisitors = async (limit = 50) => {
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  return Visitor.find({ isBot: { $ne: true }, lastSeen: { $gte: threshold } })
    .sort({ lastSeen: -1 })
    .limit(limit)
    .select(
      "sessionId userId isLoggedIn country city device browser os pageViewed eventsCount currentPage landingPage lastSeen isMobile"
    )
    .lean();
};

const getRecentVisitors = async ({ page = 1, limit = 50, country, device, search } = {}) => {
  const query = { isBot: { $ne: true } };
  if (country) query.country = country;
  if (device) query.device = device;
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ landingPage: re }, { referrerHost: re }, { city: re }, { ip: re }];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Visitor.find(query)
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "sessionId userId isLoggedIn ip country city device browser os pagesViewed eventsCount landingPage referrerHost durationMs lastSeen isMobile"
      )
      .lean(),
    Visitor.countDocuments(query),
  ]);

  return { items, total, page, limit };
};

const getRecentEvents = async ({ page = 1, limit = 100, type, category, sessionId } = {}) => {
  const query = {};
  if (type) query.type = type;
  if (category) query.category = category;
  if (sessionId) query.sessionId = sessionId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Event.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(query),
  ]);

  return { items, total, page, limit };
};

const getActions = async (days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const [byType, byCategory, byCountry, recentPurchases, funnel] = await Promise.all([
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: { country: "$country", type: "$type" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Event.find({ type: "purchase", timestamp: { $gte: start } })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean(),
    (async () => {
      const types = ["product_view", "add_to_cart", "checkout_start", "purchase"];
      const counts = await Event.aggregate([
        { $match: { timestamp: { $gte: start }, type: { $in: types } } },
        { $group: { _id: "$type", uniqueSessions: { $addToSet: "$sessionId" } } },
      ]);
      const map = Object.fromEntries(counts.map((c) => [c._id, c.uniqueSessions.length]));
      return types.map((t) => ({ step: t, count: map[t] || 0 }));
    })(),
  ]);

  return {
    byType: byType.map((t) => ({ type: t._id, count: t.count })),
    byCategory: byCategory.map((c) => ({ category: c._id, count: c.count })),
    byCountry: byCountry.map((c) => ({
      country: c._id.country,
      type: c._id.type,
      count: c.count,
    })),
    recentPurchases: recentPurchases.map((p) => ({
      sessionId: p.sessionId,
      userId: p.userId,
      value: p.value,
      currency: p.currency,
      label: p.label,
      country: p.country,
      city: p.city,
      timestamp: p.timestamp,
    })),
    funnel,
  };
};

const getSessions = async (limit = 50) => {
  return Visitor.find({ isBot: { $ne: true } })
    .sort({ lastSeen: -1 })
    .limit(limit)
    .select(
      "sessionId userId isLoggedIn country city device browser os pagesViewed eventsCount landingPage durationMs lastSeen"
    )
    .lean();
};

module.exports = {
  recordVisitor,
  recordEvent,
  updateVisitorActivity,
  endVisitorSession,
  incrementVisitorEvents,
  markInactiveVisitors,
  getOverview,
  getTimeline,
  getLiveVisitors,
  getRecentVisitors,
  getRecentEvents,
  getActions,
  getSessions,
  ACTIVE_THRESHOLD_MS,
};
