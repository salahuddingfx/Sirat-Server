const HeroSlide = require("../models/heroSlide.model");

const formatSlide = (slide) => {
  if (!slide) return null;
  const obj = slide.toObject ? slide.toObject() : slide;
  obj.id = obj._id;
  return obj;
};

const getActiveSlides = async () => {
  const slides = await HeroSlide.find({ isActive: true }).sort({ order: 1 });
  return slides.map(formatSlide);
};

const getAllSlides = async () => {
  const slides = await HeroSlide.find().sort({ order: 1 });
  return slides.map(formatSlide);
};

const createSlide = async (slideData) => {
  const created = await HeroSlide.create(slideData);
  return formatSlide(created);
};

const updateSlide = async (id, slideData) => {
  const updated = await HeroSlide.findByIdAndUpdate(
    id,
    { $set: slideData },
    { new: true }
  );
  return formatSlide(updated);
};

const deleteSlide = async (id) => {
  const deleted = await HeroSlide.findByIdAndDelete(id);
  return formatSlide(deleted);
};

module.exports = {
  getActiveSlides,
  getAllSlides,
  createSlide,
  updateSlide,
  deleteSlide,
};