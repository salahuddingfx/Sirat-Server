const Visitor = require("../models/visitor.model");
const Event = require("../models/event.model");
const crypto = require("crypto");

const ACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

const getActiveThreshold = () => new Date(Date.now() - ACTIVE_THRESHOLD_MS);

const recordVisitor = async (data) => {
  if (!data || !data.sessionId) return null;
  if (data.isBot) return null;

  try {
    const filter = { sessionId: data.sessionId };
    const update = {
      $set: {
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
      $inc: { pagesViewed: 1 }
    };

    const options = { new: true, upsert: true };
    const result = await Visitor.findOneAndUpdate(filter, update, options);
    
    if (result) {
      const formatted = result.toObject();
      formatted.id = formatted._id;
      return formatted;
    }
    return null;
  } catch (err) {
    const found = await Visitor.findOne({ sessionId: data.sessionId });
    if (found) {
      const formatted = found.toObject();
      formatted.id = formatted._id;
      return formatted;
    }
    return null;
  }
};

const updateVisitorActivity = async (sessionId, patch = {}) => {
  if (!sessionId) return null;
  const updated = await Visitor.findOneAndUpdate(
    { sessionId },
    { $set: { lastSeen: new Date(), isActive: true, ...patch } },
    { new: true }
  );
  if (updated) {
    const formatted = updated.toObject();
    formatted.id = formatted._id;
    return formatted;
  }
  return null;
};

const endVisitorSession = async (sessionId, durationMs) => {
  if (!sessionId) return null;
  const updated = await Visitor.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        isActive: false,
        lastSeen: new Date(),
        durationMs: durationMs || 0,
      }
    },
    { new: true }
  );
  if (updated) {
    const formatted = updated.toObject();
    formatted.id = formatted._id;
    return formatted;
  }
  return null;
};

const incrementVisitorEvents = async (sessionId) => {
  if (!sessionId) return null;
  const updated = await Visitor.findOneAndUpdate(
    { sessionId },
    {
      $set: { lastSeen: new Date(), isActive: true },
      $inc: { eventsCount: 1 }
    },
    { new: true }
  );
  if (updated) {
    const formatted = updated.toObject();
    formatted.id = formatted._id;
    return formatted;
  }
  return null;
};

const recordEvent = async (data) => {
  if (!data || !data.type || !data.sessionId) return null;

  const created = await Event.create({
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
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    ip: data.ip || "",
    country: data.country || "Unknown",
    city: data.city || "Unknown",
    device: data.device || "desktop",
    browser: data.browser || "Unknown",
    timestamp: new Date(),
  });

  if (created) {
    const formatted = created.toObject();
    formatted.id = formatted._id;
    return formatted;
  }
  return null;
};

const markInactiveVisitors = async () => {
  const cutoff = getActiveThreshold();
  return await Visitor.updateMany(
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

  // Helper function for aggregate sum extraction
  const getSumVal = (aggRes) => aggRes && aggRes.length > 0 ? aggRes[0].sum || 0 : 0;

  const [
    totalVisitors,
    totalPageviewsRes,
    totalEvents,
    uniqueCountries,
    uniqueCities,
    periodVisitors,
    periodPageviewsRes,
    periodEvents,
    periodUniqueSessions,
    prevPeriodVisitors,
    prevPeriodPageviewsRes,
    prevPeriodUniqueSessions,
    activeVisitors,
    onlineVisitors,
    topCountriesRes,
    topCitiesRes,
    topBrowsersRes,
    topDevicesRes,
    topReferrersRes,
    topPagesRes,
    deviceBreakdownRes,
  ] = await Promise.all([
    Visitor.countDocuments({ isBot: false }),
    Visitor.aggregate([{ $match: { isBot: false } }, { $group: { _id: null, sum: { $sum: "$pagesViewed" } } }]),
    Event.countDocuments({}),
    Visitor.distinct("country", { isBot: false }),
    Visitor.distinct("city", { isBot: false }),
    Visitor.countDocuments({ isBot: false, createdAt: { $gte: start } }),
    Visitor.aggregate([{ $match: { isBot: false, createdAt: { $gte: start } } }, { $group: { _id: null, sum: { $sum: "$pagesViewed" } } }]),
    Event.countDocuments({ timestamp: { $gte: start } }),
    Visitor.distinct("sessionId", { isBot: false, createdAt: { $gte: start } }),
    Visitor.countDocuments({ isBot: false, createdAt: { $gte: prevStart, $lt: start } }),
    Visitor.aggregate([{ $match: { isBot: false, createdAt: { $gte: prevStart, $lt: start } } }, { $group: { _id: null, sum: { $sum: "$pagesViewed" } } }]),
    Visitor.distinct("sessionId", { isBot: false, createdAt: { $gte: prevStart, $lt: start } }),
    Visitor.countDocuments({ isBot: false, isActive: true, lastSeen: { $gte: getActiveThreshold() } }),
    Visitor.countDocuments({ isBot: false, lastSeen: { $gte: last5min } }),
    Visitor.aggregate([{ $match: { isBot: false } }, { $group: { _id: "$country", cnt: { $sum: 1 } } }, { $sort: { cnt: -1 } }, { $limit: 10 }]),
    Visitor.aggregate([{ $match: { isBot: false } }, { $group: { _id: { country: "$country", city: "$city" }, cnt: { $sum: 1 } } }, { $sort: { cnt: -1 } }, { $limit: 10 }]),
    Visitor.aggregate([{ $match: { isBot: false } }, { $group: { _id: "$browser", cnt: { $sum: 1 } } }, { $sort: { cnt: -1 } }, { $limit: 8 }]),
    Visitor.aggregate([{ $match: { isBot: false } }, { $group: { _id: "$device", cnt: { $sum: 1 } } }, { $sort: { cnt: -1 } }]),
    Visitor.aggregate([{ $match: { isBot: false, referrerHost: { $ne: "" } } }, { $group: { _id: "$referrerHost", cnt: { $sum: 1 } } }, { $sort: { cnt: -1 } }, { $limit: 10 }]),
    Visitor.aggregate([{ $match: { isBot: false } }, { $group: { _id: "$landingPage", cnt: { $sum: 1 } } }, { $sort: { cnt: -1 } }, { $limit: 10 }]),
    Visitor.aggregate([{ $match: { isBot: false } }, { $group: { _id: "$isMobile", cnt: { $sum: 1 } } }]),
  ]);

  const totalPageviews = getSumVal(totalPageviewsRes);
  const periodPageviews = getSumVal(periodPageviewsRes);
  const prevPageviews = getSumVal(prevPeriodPageviewsRes);

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
      events: periodEvents,
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
    topCountries: topCountriesRes.map((c) => ({ country: c._id, count: c.cnt })),
    topCities: topCitiesRes.map((c) => ({
      country: c._id.country,
      city: c._id.city,
      count: c.cnt,
    })),
    topBrowsers: topBrowsersRes.map((b) => ({ browser: b._id, count: b.cnt })),
    topDevices: topDevicesRes.map((d) => ({ device: d._id, count: d.cnt })),
    topReferrers: topReferrersRes.map((r) => ({ referrer: r._id, count: r.cnt })),
    topPages: topPagesRes.map((p) => ({ path: p._id, count: p.cnt })),
    deviceBreakdown: deviceBreakdownRes.map((d) => ({ type: d._id ? "mobile" : "desktop", count: d.cnt })),
  };
};

const getTimeline = async (days = 7) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [visitorsByDayRows, eventsByDayRows, eventsByTypeRes] = await Promise.all([
    Visitor.aggregate([
      { $match: { isBot: false, createdAt: { $gte: start } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          visitors: { $sum: 1 },
          pageviews: { $sum: "$pagesViewed" }
      } },
      { $sort: { _id: 1 } }
    ]),
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          events: { $sum: 1 }
      } },
      { $sort: { _id: 1 } }
    ]),
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: "$type", cnt: { $sum: 1 } } },
      { $sort: { cnt: -1 } },
      { $limit: 15 }
    ])
  ]);

  return {
    visitorsByDay: visitorsByDayRows.map((d) => ({
      date: d._id,
      visitors: d.visitors,
      pageviews: d.pageviews,
      events: 0,
    })),
    eventsByDay: eventsByDayRows.map((d) => ({
      date: d._id,
      events: d.events,
    })),
    eventsByType: eventsByTypeRes.map((e) => ({ type: e._id, count: e.cnt })),
  };
};

const getLiveVisitors = async (limit = 50) => {
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  const items = await Visitor.find({
    isBot: false,
    lastSeen: { $gte: threshold }
  })
  .select("sessionId userId isLoggedIn country city device browser os pagesViewed eventsCount landingPage lastSeen isMobile")
  .sort({ lastSeen: -1 })
  .limit(limit);

  return items.map((itm) => {
    const formatted = itm.toObject();
    formatted.id = formatted._id;
    return formatted;
  });
};

const getRecentVisitors = async ({ page = 1, limit = 50, country, device, search } = {}) => {
  const filter = { isBot: false };
  if (country) filter.country = country;
  if (device) filter.device = device;
  if (search) {
    filter.$or = [
      { landingPage: new RegExp(search, "i") },
      { referrerHost: new RegExp(search, "i") },
      { city: new RegExp(search, "i") },
      { ip: new RegExp(search, "i") }
    ];
  }

  const skip = (page - 1) * limit;
  const items = await Visitor.find(filter)
    .select("sessionId userId isLoggedIn ip country city device browser os pagesViewed eventsCount landingPage referrerHost durationMs lastSeen isMobile")
    .sort({ lastSeen: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Visitor.countDocuments(filter);

  const itemsFormatted = items.map((itm) => {
    const formatted = itm.toObject();
    formatted.id = formatted._id;
    return formatted;
  });

  return { items: itemsFormatted, total, page, limit };
};

const getRecentEvents = async ({ page = 1, limit = 100, type, category, sessionId } = {}) => {
  const filter = {};
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (sessionId) filter.sessionId = sessionId;

  const skip = (page - 1) * limit;
  const items = await Event.find(filter)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Event.countDocuments(filter);

  const itemsFormatted = items.map((itm) => {
    const formatted = itm.toObject();
    formatted.id = formatted._id;
    return formatted;
  });

  return { items: itemsFormatted, total, page, limit };
};

const getActions = async (days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const [byType, byCategory, byCountry, recentPurchases, funnelSteps] = await Promise.all([
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: "$type", cnt: { $sum: 1 } } },
      { $sort: { cnt: -1 } }
    ]),
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: "$category", cnt: { $sum: 1 } } },
      { $sort: { cnt: -1 } }
    ]),
    Event.aggregate([
      { $match: { timestamp: { $gte: start } } },
      { $group: { _id: { country: "$country", type: "$type" }, cnt: { $sum: 1 } } },
      { $sort: { cnt: -1 } }
    ]),
    Event.find({ type: "purchase", timestamp: { $gte: start } })
      .sort({ timestamp: -1 })
      .limit(20),
    (async () => {
      const types = ["product_view", "add_to_cart", "checkout_start", "purchase"];
      const funnelCounts = [];
      for (const t of types) {
        const uniqueSessions = await Event.distinct("sessionId", {
          timestamp: { $gte: start },
          type: t
        });
        funnelCounts.push(uniqueSessions.length);
      }
      return types.map((t, idx) => ({ step: t, count: funnelCounts[idx] }));
    })(),
  ]);

  return {
    byType: byType.map((t) => ({ type: t._id, count: t.cnt })),
    byCategory: byCategory.map((c) => ({ category: c._id, count: c.cnt })),
    byCountry: byCountry.map((c) => ({
      country: c._id.country,
      type: c._id.type,
      count: c.cnt,
    })),
    recentPurchases: recentPurchases.map((p) => {
      const formatted = p.toObject();
      formatted.id = formatted._id;
      return formatted;
    }),
    funnel: funnelSteps,
  };
};

const getSessions = async (limit = 50) => {
  const sessions = await Visitor.find({ isBot: false })
    .select("sessionId userId isLoggedIn country city device browser os pagesViewed eventsCount landingPage durationMs lastSeen")
    .sort({ lastSeen: -1 })
    .limit(limit);

  return sessions.map((s) => {
    const formatted = s.toObject();
    formatted.id = formatted._id;
    return formatted;
  });
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
