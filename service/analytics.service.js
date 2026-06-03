const { db, pool } = require("../config/db.config");
const { visitor, event } = require("../db/schema");
const { eq, and, desc, asc, lte, gte, lt, count, sum, not, sql, or, like } = require("drizzle-orm");
const crypto = require("crypto");

const ACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

const getActiveThreshold = () => new Date(Date.now() - ACTIVE_THRESHOLD_MS);

const recordVisitor = async (data) => {
  if (!data || !data.sessionId) return null;
  if (data.isBot) return null;

  try {
    const insertValues = {
      id: crypto.randomUUID(),
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
    };

    await db.insert(visitor)
      .values(insertValues)
      .onDuplicateKeyUpdate({
        set: {
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
          pagesViewed: sql`pagesViewed + 1`,
        }
      });

    return await db.query.visitor.findFirst({
      where: eq(visitor.sessionId, data.sessionId),
    });
  } catch (err) {
    return await db.query.visitor.findFirst({
      where: eq(visitor.sessionId, data.sessionId),
    });
  }
};

const updateVisitorActivity = async (sessionId, patch = {}) => {
  if (!sessionId) return null;
  await db.update(visitor)
    .set({ lastSeen: new Date(), isActive: true, ...patch })
    .where(eq(visitor.sessionId, sessionId));
  return await db.query.visitor.findFirst({
    where: eq(visitor.sessionId, sessionId),
  });
};

const endVisitorSession = async (sessionId, durationMs) => {
  if (!sessionId) return null;
  await db.update(visitor)
    .set({
      isActive: false,
      lastSeen: new Date(),
      durationMs: durationMs || 0,
    })
    .where(eq(visitor.sessionId, sessionId));
  return await db.query.visitor.findFirst({
    where: eq(visitor.sessionId, sessionId),
  });
};

const incrementVisitorEvents = async (sessionId) => {
  if (!sessionId) return null;
  await db.update(visitor)
    .set({
      eventsCount: sql`eventsCount + 1`,
      lastSeen: new Date(),
      isActive: true,
    })
    .where(eq(visitor.sessionId, sessionId));
  return await db.query.visitor.findFirst({
    where: eq(visitor.sessionId, sessionId),
  });
};

const recordEvent = async (data) => {
  if (!data || !data.type || !data.sessionId) return null;
  const eventId = crypto.randomUUID();
  await db.insert(event).values({
    id: eventId,
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
  return await db.query.event.findFirst({
    where: eq(event.id, eventId),
  });
};

const markInactiveVisitors = async () => {
  const cutoff = getActiveThreshold();
  return await db.update(visitor)
    .set({ isActive: false })
    .where(and(
      eq(visitor.isActive, true),
      lt(visitor.lastSeen, cutoff)
    ));
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
    [totalVisitorsRes],
    [totalPageviewsRes],
    [totalEventsRes],
    uniqueCountriesRes,
    uniqueCitiesRes,
    [periodVisitorsRes],
    [periodPageviewsRes],
    [periodEventsRes],
    periodUniqueSessionsRes,
    [prevPeriodVisitorsRes],
    [prevPeriodPageviewsRes],
    prevPeriodUniqueSessionsRes,
    [activeVisitorsRes],
    [onlineVisitorsRes],
    topCountries,
    topCities,
    topBrowsers,
    topDevices,
    topReferrers,
    topPages,
    deviceBreakdown,
  ] = await Promise.all([
    db.select({ value: count() }).from(visitor).where(eq(visitor.isBot, false)),
    db.select({ value: sum(visitor.pagesViewed) }).from(visitor).where(eq(visitor.isBot, false)),
    db.select({ value: count() }).from(event),
    db.select({ country: visitor.country }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.country),
    db.select({ city: visitor.city }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.city),
    db.select({ value: count() }).from(visitor).where(and(eq(visitor.isBot, false), gte(visitor.createdAt, start))),
    db.select({ value: sum(visitor.pagesViewed) }).from(visitor).where(and(eq(visitor.isBot, false), gte(visitor.createdAt, start))),
    db.select({ value: count() }).from(event).where(gte(event.timestamp, start)),
    db.select({ sessionId: visitor.sessionId }).from(visitor).where(and(eq(visitor.isBot, false), gte(visitor.createdAt, start))).groupBy(visitor.sessionId),
    db.select({ value: count() }).from(visitor).where(and(eq(visitor.isBot, false), gte(visitor.createdAt, prevStart), lt(visitor.createdAt, start))),
    db.select({ value: sum(visitor.pagesViewed) }).from(visitor).where(and(eq(visitor.isBot, false), gte(visitor.createdAt, prevStart), lt(visitor.createdAt, start))),
    db.select({ sessionId: visitor.sessionId }).from(visitor).where(and(eq(visitor.isBot, false), gte(visitor.createdAt, prevStart), lt(visitor.createdAt, start))).groupBy(visitor.sessionId),
    db.select({ value: count() }).from(visitor).where(and(eq(visitor.isBot, false), eq(visitor.isActive, true), gte(visitor.lastSeen, getActiveThreshold()))),
    db.select({ value: count() }).from(visitor).where(and(eq(visitor.isBot, false), gte(visitor.lastSeen, last5min))),
    db.select({ country: visitor.country, cnt: count() }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.country).orderBy(desc(count())).limit(10),
    db.select({ country: visitor.country, city: visitor.city, cnt: count() }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.country, visitor.city).orderBy(desc(count())).limit(10),
    db.select({ browser: visitor.browser, cnt: count() }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.browser).orderBy(desc(count())).limit(8),
    db.select({ device: visitor.device, cnt: count() }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.device).orderBy(desc(count())),
    db.select({ referrerHost: visitor.referrerHost, cnt: count() }).from(visitor).where(and(eq(visitor.isBot, false), not(eq(visitor.referrerHost, "")))).groupBy(visitor.referrerHost).orderBy(desc(count())).limit(10),
    db.select({ landingPage: visitor.landingPage, cnt: count() }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.landingPage).orderBy(desc(count())).limit(10),
    db.select({ isMobile: visitor.isMobile, cnt: count() }).from(visitor).where(eq(visitor.isBot, false)).groupBy(visitor.isMobile),
  ]);

  const totalVisitors = totalVisitorsRes.value;
  const totalPageviews = Number(totalPageviewsRes.value || 0);
  const totalEvents = totalEventsRes.value;
  const uniqueCountriesCount = uniqueCountriesRes.length;
  const uniqueCitiesCount = uniqueCitiesRes.length;

  const periodVisitors = periodVisitorsRes.value;
  const periodPageviews = Number(periodPageviewsRes.value || 0);
  const periodEvents = periodEventsRes.value;
  const periodUniqueSessionsCount = periodUniqueSessionsRes.length;

  const prevPeriodVisitors = prevPeriodVisitorsRes.value;
  const prevPageviews = Number(prevPeriodPageviewsRes.value || 0);
  const prevPeriodUniqueSessionsCount = prevPeriodUniqueSessionsRes.length;

  const activeVisitors = activeVisitorsRes.value;
  const onlineVisitors = onlineVisitorsRes.value;

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
      countries: uniqueCountriesCount,
      cities: uniqueCitiesCount,
    },
    periodStats: {
      visitors: periodVisitors,
      pageviews: periodPageviews,
      events: periodEvents,
      uniqueSessions: periodUniqueSessionsCount,
    },
    periodChange: {
      visitors: changePct(periodVisitors, prevPeriodVisitors),
      pageviews: changePct(periodPageviews, prevPageviews),
      uniqueSessions: changePct(periodUniqueSessionsCount, prevPeriodUniqueSessionsCount),
    },
    live: {
      active: activeVisitors,
      online: onlineVisitors,
    },
    topCountries: topCountries.map((c) => ({ country: c.country, count: c.cnt })),
    topCities: topCities.map((c) => ({
      country: c.country,
      city: c.city,
      count: c.cnt,
    })),
    topBrowsers: topBrowsers.map((b) => ({ browser: b.browser, count: b.cnt })),
    topDevices: topDevices.map((d) => ({ device: d.device, count: d.cnt })),
    topReferrers: topReferrers.map((r) => ({ referrer: r.referrerHost, count: r.cnt })),
    topPages: topPages.map((p) => ({ path: p.landingPage, count: p.cnt })),
    deviceBreakdown: deviceBreakdown.map((d) => ({ type: d.isMobile ? "mobile" : "desktop", count: d.cnt })),
  };
};

const getTimeline = async (days = 7) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [visitorsByDayRows] = await pool.query(
    "SELECT DATE(createdAt) as date, COUNT(*) as visitors, SUM(pagesViewed) as pageviews FROM `visitor` WHERE isBot = 0 AND createdAt >= ? GROUP BY DATE(createdAt) ORDER BY date ASC",
    [start]
  );

  const [eventsByDayRows] = await pool.query(
    "SELECT DATE(timestamp) as date, COUNT(*) as events FROM `event` WHERE timestamp >= ? GROUP BY DATE(timestamp) ORDER BY date ASC",
    [start]
  );

  const eventsByType = await db.select({
    type: event.type,
    cnt: count(),
  })
  .from(event)
  .where(gte(event.timestamp, start))
  .groupBy(event.type)
  .orderBy(desc(count()))
  .limit(15);

  return {
    visitorsByDay: visitorsByDayRows.map((d) => {
      const dateObj = d.date instanceof Date ? d.date : new Date(d.date);
      return {
        date: dateObj.toISOString().split("T")[0],
        visitors: Number(d.visitors),
        pageviews: Number(d.pageviews),
        events: 0,
      };
    }),
    eventsByDay: eventsByDayRows.map((d) => {
      const dateObj = d.date instanceof Date ? d.date : new Date(d.date);
      return {
        date: dateObj.toISOString().split("T")[0],
        events: Number(d.events),
      };
    }),
    eventsByType: eventsByType.map((e) => ({ type: e.type, count: e.cnt })),
  };
};

const getLiveVisitors = async (limit = 50) => {
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  return await db.query.visitor.findMany({
    where: and(
      eq(visitor.isBot, false),
      gte(visitor.lastSeen, threshold)
    ),
    orderBy: [desc(visitor.lastSeen)],
    limit: limit,
    columns: {
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
  const conditions = [eq(visitor.isBot, false)];
  if (country) conditions.push(eq(visitor.country, country));
  if (device) conditions.push(eq(visitor.device, device));
  if (search) {
    conditions.push(or(
      like(visitor.landingPage, `%${search}%`),
      like(visitor.referrerHost, `%${search}%`),
      like(visitor.city, `%${search}%`),
      like(visitor.ip, `%${search}%`)
    ));
  }

  const skip = (page - 1) * limit;
  const items = await db.query.visitor.findMany({
    where: and(...conditions),
    orderBy: [desc(visitor.lastSeen)],
    offset: skip,
    limit: limit,
    columns: {
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
  });

  const [totalRes] = await db.select({ value: count() })
    .from(visitor)
    .where(and(...conditions));

  return { items, total: totalRes.value, page, limit };
};

const getRecentEvents = async ({ page = 1, limit = 100, type, category, sessionId } = {}) => {
  const conditions = [];
  if (type) conditions.push(eq(event.type, type));
  if (category) conditions.push(eq(event.category, category));
  if (sessionId) conditions.push(eq(event.sessionId, sessionId));

  const skip = (page - 1) * limit;
  const items = await db.query.event.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(event.timestamp)],
    offset: skip,
    limit: limit,
  });

  const [totalRes] = await db.select({ value: count() })
    .from(event)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return { items, total: totalRes.value, page, limit };
};

const getActions = async (days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const [byType, byCategory, byCountry, recentPurchases, funnel] = await Promise.all([
    db.select({
      type: event.type,
      cnt: count(),
    })
    .from(event)
    .where(gte(event.timestamp, start))
    .groupBy(event.type)
    .orderBy(desc(count())),

    db.select({
      category: event.category,
      cnt: count(),
    })
    .from(event)
    .where(gte(event.timestamp, start))
    .groupBy(event.category)
    .orderBy(desc(count())),

    db.select({
      country: event.country,
      type: event.type,
      cnt: count(),
    })
    .from(event)
    .where(gte(event.timestamp, start))
    .groupBy(event.country, event.type)
    .orderBy(desc(count())),

    db.query.event.findMany({
      where: and(
        eq(event.type, "purchase"),
        gte(event.timestamp, start)
      ),
      orderBy: [desc(event.timestamp)],
      limit: 20,
    }),

    (async () => {
      const types = ["product_view", "add_to_cart", "checkout_start", "purchase"];
      const countsList = [];
      for (const t of types) {
        const res = await db.select({ sessionId: event.sessionId })
          .from(event)
          .where(and(
            gte(event.timestamp, start),
            eq(event.type, t)
          ))
          .groupBy(event.sessionId);
        countsList.push(res.length);
      }
      return types.map((t, i) => ({ step: t, count: countsList[i] }));
    })(),
  ]);

  return {
    byType: byType.map((t) => ({ type: t.type, count: t.cnt })),
    byCategory: byCategory.map((c) => ({ category: c.category, count: c.cnt })),
    byCountry: byCountry.map((c) => ({
      country: c.country,
      type: c.type,
      count: c.cnt,
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
  return await db.query.visitor.findMany({
    where: eq(visitor.isBot, false),
    orderBy: [desc(visitor.lastSeen)],
    limit: limit,
    columns: {
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
