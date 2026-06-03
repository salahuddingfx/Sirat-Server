const { prisma } = require("../config/db.config");

const ACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

const getActiveThreshold = () => new Date(Date.now() - ACTIVE_THRESHOLD_MS);

const recordVisitor = async (data) => {
  if (!data || !data.sessionId) return null;
  if (data.isBot) return null;

  try {
    return await prisma.visitor.upsert({
      where: { sessionId: data.sessionId },
      update: {
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
        pagesViewed: { increment: 1 },
      },
      create: {
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
        pagesViewed: 1,
      },
    });
  } catch (err) {
    return await prisma.visitor.findUnique({ where: { sessionId: data.sessionId } });
  }
};

const updateVisitorActivity = async (sessionId, patch = {}) => {
  if (!sessionId) return null;
  return await prisma.visitor.update({
    where: { sessionId },
    data: { lastSeen: new Date(), isActive: true, ...patch },
  });
};

const endVisitorSession = async (sessionId, durationMs) => {
  if (!sessionId) return null;
  return await prisma.visitor.update({
    where: { sessionId },
    data: {
      isActive: false,
      lastSeen: new Date(),
      durationMs: durationMs || 0,
    },
  });
};

const incrementVisitorEvents = async (sessionId) => {
  if (!sessionId) return null;
  return await prisma.visitor.update({
    where: { sessionId },
    data: {
      eventsCount: { increment: 1 },
      lastSeen: new Date(),
      isActive: true,
    },
  });
};

const recordEvent = async (data) => {
  if (!data || !data.type || !data.sessionId) return null;
  return await prisma.event.create({
    data: {
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
    },
  });
};

const markInactiveVisitors = async () => {
  const cutoff = getActiveThreshold();
  return await prisma.visitor.updateMany({
    where: { isActive: true, lastSeen: { lt: cutoff } },
    data: { isActive: false },
  });
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
    topCountries,
    topCities,
    topBrowsers,
    topDevices,
    topReferrers,
    topPages,
    deviceBreakdown,
  ] = await Promise.all([
    prisma.visitor.count({ where: { isBot: false } }),
    prisma.visitor.aggregate({
      _sum: { pagesViewed: true },
      where: { isBot: false },
    }),
    prisma.event.count(),
    prisma.visitor.findMany({
      where: { isBot: false },
      select: { country: true },
      distinct: ["country"],
    }),
    prisma.visitor.findMany({
      where: { isBot: false },
      select: { city: true },
      distinct: ["city"],
    }),
    prisma.visitor.count({ where: { isBot: false, createdAt: { gte: start } } }),
    prisma.visitor.aggregate({
      _sum: { pagesViewed: true },
      where: { isBot: false, createdAt: { gte: start } },
    }),
    prisma.event.count({ where: { timestamp: { gte: start } } }),
    prisma.visitor.findMany({
      where: { isBot: false, createdAt: { gte: start } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }),
    prisma.visitor.count({ where: { isBot: false, createdAt: { gte: prevStart, lt: start } } }),
    prisma.visitor.aggregate({
      _sum: { pagesViewed: true },
      where: { isBot: false, createdAt: { gte: prevStart, lt: start } },
    }),
    prisma.visitor.findMany({
      where: { isBot: false, createdAt: { gte: prevStart, lt: start } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }),
    prisma.visitor.count({
      where: { isBot: false, isActive: true, lastSeen: { gte: getActiveThreshold() } },
    }),
    prisma.visitor.count({ where: { isBot: false, lastSeen: { gte: last5min } } }),
    prisma.visitor.groupBy({
      by: ["country"],
      where: { isBot: false },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 10,
    }),
    prisma.visitor.groupBy({
      by: ["country", "city"],
      where: { isBot: false },
      _count: { _all: true },
      orderBy: { _count: { _all: "desc" } },
      take: 10,
    }),
    prisma.visitor.groupBy({
      by: ["browser"],
      where: { isBot: false },
      _count: { _all: true },
      orderBy: { _count: { browser: "desc" } },
      take: 8,
    }),
    prisma.visitor.groupBy({
      by: ["device"],
      where: { isBot: false },
      _count: { _all: true },
      orderBy: { _count: { device: "desc" } },
    }),
    prisma.visitor.groupBy({
      by: ["referrerHost"],
      where: { isBot: false, referrerHost: { not: "" } },
      _count: { _all: true },
      orderBy: { _count: { referrerHost: "desc" } },
      take: 10,
    }),
    prisma.visitor.groupBy({
      by: ["landingPage"],
      where: { isBot: false },
      _count: { _all: true },
      orderBy: { _count: { landingPage: "desc" } },
      take: 10,
    }),
    prisma.visitor.groupBy({
      by: ["isMobile"],
      where: { isBot: false },
      _count: { _all: true },
    }),
  ]);

  const totalPageviews = totalPageviewsRes._sum.pagesViewed || 0;
  const periodPageviews = periodPageviewsRes._sum.pagesViewed || 0;
  const prevPageviews = prevPeriodPageviewsRes._sum.pagesViewed || 0;

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
    topCountries: topCountries.map((c) => ({ country: c.country, count: c._count._all })),
    topCities: topCities.map((c) => ({
      country: c.country,
      city: c.city,
      count: c._count._all,
    })),
    topBrowsers: topBrowsers.map((b) => ({ browser: b.browser, count: b._count._all })),
    topDevices: topDevices.map((d) => ({ device: d.device, count: d._count._all })),
    topReferrers: topReferrers.map((r) => ({ referrer: r.referrerHost, count: r._count._all })),
    topPages: topPages.map((p) => ({ path: p.landingPage, count: p._count._all })),
    deviceBreakdown: deviceBreakdown.map((d) => ({ type: d.isMobile ? "mobile" : "desktop", count: d._count._all })),
  };
};

const getTimeline = async (days = 7) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  // Prisma doesn't support dateToString in groupBy directly yet without raw SQL for MySQL
  // We'll use raw query for time-series data to be efficient
  const visitorsByDay = await prisma.$queryRaw`
    SELECT DATE(createdAt) as date, COUNT(*) as visitors, SUM(pagesViewed) as pageviews
    FROM Visitor
    WHERE isBot = 0 AND createdAt >= ${start}
    GROUP BY DATE(createdAt)
    ORDER BY date ASC
  `;

  const eventsByDay = await prisma.$queryRaw`
    SELECT DATE(timestamp) as date, COUNT(*) as events
    FROM Event
    WHERE timestamp >= ${start}
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `;

  const eventsByType = await prisma.event.groupBy({
    by: ["type"],
    where: { timestamp: { gte: start } },
    _count: { _all: true },
    orderBy: { _count: { type: "desc" } },
    take: 15,
  });

  return {
    visitorsByDay: visitorsByDay.map((d) => ({
      date: d.date.toISOString().split("T")[0],
      visitors: Number(d.visitors),
      pageviews: Number(d.pageviews),
      events: 0,
    })),
    eventsByDay: eventsByDay.map((d) => ({
      date: d.date.toISOString().split("T")[0],
      events: Number(d.events),
    })),
    eventsByType: eventsByType.map((e) => ({ type: e.type, count: e._count._all })),
  };
};

const getLiveVisitors = async (limit = 50) => {
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  return await prisma.visitor.findMany({
    where: { isBot: false, lastSeen: { gte: threshold } },
    orderBy: { lastSeen: "desc" },
    take: limit,
    select: {
      sessionId: true,
      userId: true,
      isLoggedIn: true,
      country: true,
      city: true,
      device: true,
      browser: true,
      os: true,
      pagesViewed: true,
      eventsCount: true,
      landingPage: true,
      lastSeen: true,
      isMobile: true,
    },
  });
};

const getRecentVisitors = async ({ page = 1, limit = 50, country, device, search } = {}) => {
  const where = { isBot: false };
  if (country) where.country = country;
  if (device) where.device = device;
  if (search) {
    where.OR = [
      { landingPage: { contains: search } },
      { referrerHost: { contains: search } },
      { city: { contains: search } },
      { ip: { contains: search } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.visitor.findMany({
      where,
      orderBy: { lastSeen: "desc" },
      skip,
      take: limit,
      select: {
        sessionId: true,
        userId: true,
        isLoggedIn: true,
        ip: true,
        country: true,
        city: true,
        device: true,
        browser: true,
        os: true,
        pagesViewed: true,
        eventsCount: true,
        landingPage: true,
        referrerHost: true,
        durationMs: true,
        lastSeen: true,
        isMobile: true,
      },
    }),
    prisma.visitor.count({ where }),
  ]);

  return { items, total, page, limit };
};

const getRecentEvents = async ({ page = 1, limit = 100, type, category, sessionId } = {}) => {
  const where = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (sessionId) where.sessionId = sessionId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total, page, limit };
};

const getActions = async (days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const [byType, byCategory, byCountry, recentPurchases, funnel] = await Promise.all([
    prisma.event.groupBy({
      by: ["type"],
      where: { timestamp: { gte: start } },
      _count: { _all: true },
      orderBy: { _count: { type: "desc" } },
    }),
    prisma.event.groupBy({
      by: ["category"],
      where: { timestamp: { gte: start } },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.event.groupBy({
      by: ["country", "type"],
      where: { timestamp: { gte: start } },
      _count: { _all: true },
      orderBy: { _count: { _all: "desc" } },
    }),
    prisma.event.findMany({
      where: { type: "purchase", timestamp: { gte: start } },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),
    (async () => {
      const types = ["product_view", "add_to_cart", "checkout_start", "purchase"];
      const counts = await Promise.all(
        types.map((type) =>
          prisma.event
            .findMany({
              where: { timestamp: { gte: start }, type },
              select: { sessionId: true },
              distinct: ["sessionId"],
            })
            .then((r) => r.length)
        )
      );
      return types.map((t, i) => ({ step: t, count: counts[i] }));
    })(),
  ]);

  return {
    byType: byType.map((t) => ({ type: t.type, count: t._count._all })),
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count._all })),
    byCountry: byCountry.map((c) => ({
      country: c.country,
      type: c.type,
      count: c._count._all,
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
  return await prisma.visitor.findMany({
    where: { isBot: false },
    orderBy: { lastSeen: "desc" },
    take: limit,
    select: {
      sessionId: true,
      userId: true,
      isLoggedIn: true,
      country: true,
      city: true,
      device: true,
      browser: true,
      os: true,
      pagesViewed: true,
      eventsCount: true,
      landingPage: true,
      durationMs: true,
      lastSeen: true,
    },
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
