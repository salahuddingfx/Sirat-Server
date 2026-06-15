const Settings = require("../models/settings.model");
const cache = require("../config/cache.config");
const { getPublicUrl } = require("../config/multer.config");

const formatSettings = (s) => {
  if (!s) return null;
  const obj = s.toObject ? s.toObject() : s;
  obj.id = obj._id;
  return obj;
};

const getSettings = async (req, res) => {
  try {
    const data = await cache.getOrSet(
      cache.buildKey("settings", "current"),
      async () => {
        let s = await Settings.findOne();
        if (!s) {
          s = await Settings.create({});
        }
        return formatSettings(s);
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
    let settingsRecord = await Settings.findOne();
    const updateData = { ...req.body };
    if (req.file) {
      updateData.logo = getPublicUrl(req, req.file);
    }

    if (!settingsRecord) {
      settingsRecord = await Settings.create(updateData);
    } else {
      settingsRecord = await Settings.findByIdAndUpdate(
        settingsRecord._id,
        { $set: updateData },
        { new: true }
      );
    }
    
    cache.invalidateNamespace("settings");
    res.status(200).json({ success: true, data: formatSettings(settingsRecord) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
