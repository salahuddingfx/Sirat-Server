const geoip = require("geoip-lite");
const { UAParser } = require("ua-parser-js");
const Visitor = require("../models/visitor.model");

const DEVICE_THRESHOLDS = {
  mobileUA: /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i,
  tabletUA: /ipad|tablet|kindle|playbook|silk/i,
  botUA: /bot|crawler|spider|crawling|headless|slurp|mediapartners|bingpreview|facebookexternalhit|whatsapp|telegram|twitter|discord/i,
};

const getClientIp = (req) => {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.headers["cf-connecting-ip"] ||
    req.headers["true-client-ip"] ||
    (req.ip ? req.ip.replace(/^::ffff:/, "") : "") ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    ""
  );
};

const safeHostname = (url) => {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const parseUserAgent = (ua) => {
  const parser = new UAParser(ua || "");
  const result = parser.getResult();
  const browser = result.browser;
  const os = result.os;
  const device = result.device;

  let deviceType = "desktop";
  if (device?.type === "mobile") deviceType = "mobile";
  else if (device?.type === "tablet") deviceType = "tablet";
  else if (device?.type === "wearable") deviceType = "wearable";
  else if (device?.type === "embedded") deviceType = "embedded";
  else if (DEVICE_THRESHOLDS.mobileUA.test(ua || "")) deviceType = "mobile";
  else if (DEVICE_THRESHOLDS.tabletUA.test(ua || "")) deviceType = "tablet";

  return {
    browser: browser?.name || "Unknown",
    browserVersion: browser?.version || "",
    os: os?.name || "Unknown",
    osVersion: os?.version || "",
    device: deviceType,
    isMobile: deviceType === "mobile" || deviceType === "tablet",
    isBot: !!device?.bot || DEVICE_THRESHOLDS.botUA.test(ua || ""),
  };
};

const lookupGeo = (ip) => {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return {
      country: "Local",
      countryCode: "LO",
      city: "Local Network",
      region: "",
      timezone: "",
      latitude: null,
      longitude: null,
    };
  }
  try {
    const geo = geoip.lookup(ip);
    if (!geo) {
      return {
        country: "Unknown",
        countryCode: "",
        city: "Unknown",
        region: "",
        timezone: "",
        latitude: null,
        longitude: null,
      };
    }
    return {
      country: geo.country || "Unknown",
      countryCode: geo.country || "",
      city: geo.city || "Unknown",
      region: geo.region || "",
      timezone: geo.timezone || "",
      latitude: geo.ll && Array.isArray(geo.ll) ? geo.ll[0] : null,
      longitude: geo.ll && Array.isArray(geo.ll) ? geo.ll[1] : null,
    };
  } catch {
    return {
      country: "Unknown",
      countryCode: "",
      city: "Unknown",
      region: "",
      timezone: "",
      latitude: null,
      longitude: null,
    };
  }
};

const extractRequestContext = (req) => {
  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "";
  const uaInfo = parseUserAgent(ua);
  const geo = lookupGeo(ip);

  return {
    ip,
    userAgent: ua,
    referrer: req.headers["referer"] || req.headers["referrer"] || "",
    referrerHost: safeHostname(req.headers["referer"] || req.headers["referrer"] || ""),
    language: (req.headers["accept-language"] || "").split(",")[0].trim(),
    ...uaInfo,
    ...geo,
  };
};

const getOrCreateSessionId = (req, res) => {
  let sid = req.cookies?.sirat_sid;
  if (sid) return sid;

  sid = req.headers["x-session-id"];
  if (sid && typeof sid === "string" && sid.length > 0 && sid.length < 128) {
    return sid;
  }

  sid =
    "v_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);

  if (res && typeof res.cookie === "function") {
    try {
      res.cookie("sirat_sid", sid, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } catch {
      // ignore
    }
  }

  return sid;
};

const analyticsContext = (req, res, next) => {
  req.analytics = {
    ...extractRequestContext(req),
    sessionId: getOrCreateSessionId(req, res),
    userId: req.user?.id || req.user?._id || null,
    isLoggedIn: !!req.user,
  };
  next();
};

const trackVisitor = async (req) => {
  if (!req.analytics) return null;
  if (req.analytics.isBot) return null;

  const a = req.analytics;
  const update = {
    $set: {
      sessionId: a.sessionId,
      userId: a.userId,
      isLoggedIn: a.isLoggedIn,
      ip: a.ip,
      userAgent: a.userAgent,
      country: a.country,
      countryCode: a.countryCode,
      city: a.city,
      region: a.region,
      timezone: a.timezone,
      latitude: a.latitude,
      longitude: a.longitude,
      browser: a.browser,
      browserVersion: a.browserVersion,
      os: a.os,
      osVersion: a.osVersion,
      device: a.device,
      isMobile: a.isMobile,
      isBot: a.isBot,
      language: a.language,
      landingPage: req.originalUrl || req.url || "/",
      lastSeen: new Date(),
      isActive: true,
    },
    $inc: { pagesViewed: 1 },
    $setOnInsert: { createdAt: new Date() },
  };

  if (a.referrer) {
    update.$set.referrer = a.referrer;
    update.$set.referrerHost = a.referrerHost;
  }

  try {
    const visitor = await Visitor.findOneAndUpdate(
      { sessionId: a.sessionId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return visitor;
  } catch (err) {
    if (err.code === 11000) {
      return Visitor.findOne({ sessionId: a.sessionId });
    }
    throw err;
  }
};

module.exports = {
  analyticsContext,
  trackVisitor,
  getClientIp,
  parseUserAgent,
  lookupGeo,
  extractRequestContext,
  getOrCreateSessionId,
};
