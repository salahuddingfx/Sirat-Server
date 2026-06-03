const { prisma } = require("../config/db.config");
const cache = require("../config/cache.config");

const getSettings = async (req, res) => {
  try {
    const settings = await cache.getOrSet(
      cache.buildKey("settings", "current"),
      async () => {
        let s = await prisma.settings.findFirst();
        if (!s) s = await prisma.settings.create({ data: {} });
        return s;
      },
      300
    );
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settings = await prisma.settings.findFirst();
    const updateData = { ...req.body };
    if (req.file) {
      updateData.logo = req.file.path; // Cloudinary URL
    }

    if (!settings) {
      settings = await prisma.settings.create({ data: updateData });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }
    cache.invalidateNamespace("settings");
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
