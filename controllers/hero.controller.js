const heroService = require("../service/hero.services");

const getHeroSlides = async (req, res) => {
  try {
    const slides = await heroService.getActiveSlides();
    res.status(200).json({ success: true, data: slides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetAllSlides = async (req, res) => {
  try {
    const slides = await heroService.getAllSlides();
    res.status(200).json({ success: true, data: slides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminCreateSlide = async (req, res) => {
  try {
    const slide = await heroService.createSlide(req.body);
    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminUpdateSlide = async (req, res) => {
  try {
    const slide = await heroService.updateSlide(req.params.id, req.body);
    res.status(200).json({ success: true, data: slide });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminDeleteSlide = async (req, res) => {
  try {
    await heroService.deleteSlide(req.params.id);
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
