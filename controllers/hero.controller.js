const heroService = require("../service/hero.service");
const cache = require("../config/cache.config");
const { getPublicUrl } = require("../config/multer.config");

const getHeroSlides = async (req, res) => {
  try {
    const slides = await cache.getOrSet(
      cache.buildKey("hero", "active"),
      () => heroService.getActiveSlides(),
      120
    );
    res.status(200).json({ success: true, data: slides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetAllSlides = async (req, res) => {
  try {
    const slides = await cache.getOrSet(
      cache.buildKey("hero", "all"),
      () => heroService.getAllSlides(),
      30
    );
    res.status(200).json({ success: true, data: slides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminCreateSlide = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = getPublicUrl(req, req.file);
    data.isActive = data.isActive === "true" || data.isActive === true;
    data.order = parseInt(data.order) || 0;
    const slide = await heroService.createSlide(data);
    cache.invalidateNamespace("hero");
    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminUpdateSlide = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = getPublicUrl(req, req.file);
    data.isActive = data.isActive === "true" || data.isActive === true;
    data.order = parseInt(data.order) || 0;
    const slide = await heroService.updateSlide(req.params.id, data);
    cache.invalidateNamespace("hero");
    res.status(200).json({ success: true, data: slide });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminDeleteSlide = async (req, res) => {
  try {
    await heroService.deleteSlide(req.params.id);
    cache.invalidateNamespace("hero");
    res.status(200).json({ success: true, message: "Slide deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getHeroSlides,
  adminGetAllSlides,
  adminCreateSlide,
  adminUpdateSlide,
  adminDeleteSlide,
};
