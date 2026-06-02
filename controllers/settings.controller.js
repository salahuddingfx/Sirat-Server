const Settings = require("../models/settings.model");
const cache = require("../config/cache.config");

const getSettings = async (req, res) => {
  try {
    const settings = await cache.getOrSet(
      cache.buildKey("settings", "current"),
      async () => {
        let s = await Settings.findOne();
        if (!s) s = await Settings.create({});
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
    let settings = await Settings.findOne();
    const updateData = { ...req.body };
    if (req.file) {
      updateData.logo = req.file.path; // Cloudinary URL
    }

    if (!settings) {
      settings = await Settings.create(updateData);
    } else {
      settings = await Settings.findByIdAndUpdate(settings._id, updateData, { new: true, runValidators: true });
    }
    cache.invalidateNamespace("settings");
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
