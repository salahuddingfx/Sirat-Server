const { db } = require("../config/db.config");
const { settings } = require("../db/schema");
const { eq } = require("drizzle-orm");
const cache = require("../config/cache.config");
const { getPublicUrl } = require("../config/multer.config");
const crypto = require("crypto");

const getSettings = async (req, res) => {
  try {
    const data = await cache.getOrSet(
      cache.buildKey("settings", "current"),
      async () => {
        let s = await db.query.settings.findFirst();
        if (!s) {
          const sId = crypto.randomUUID();
          await db.insert(settings).values({ id: sId });
          s = await db.query.settings.findFirst({ where: eq(settings.id, sId) });
        }
        return s;
      },
      300
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settingsRecord = await db.query.settings.findFirst();
    const updateData = { ...req.body };
    if (req.file) {
      updateData.logo = getPublicUrl(req, req.file);
    }

    if (!settingsRecord) {
      const sId = crypto.randomUUID();
      await db.insert(settings).values({
        id: sId,
        ...updateData,
      });
      settingsRecord = await db.query.settings.findFirst({ where: eq(settings.id, sId) });
    } else {
      await db.update(settings)
        .set(updateData)
        .where(eq(settings.id, settingsRecord.id));
      settingsRecord = await db.query.settings.findFirst({ where: eq(settings.id, settingsRecord.id) });
    }
    
    cache.invalidateNamespace("settings");
    res.status(200).json({ success: true, data: settingsRecord });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
