const HeroSlide = require("../models/heroSlide.model");

const getActiveSlides = async () => {
  return await HeroSlide.find({ isActive: true }).sort({ order: 1 });
};

const getAllSlides = async () => {
  return await HeroSlide.find().sort({ order: 1 });
};

const createSlide = async (slideData) => {
  return await HeroSlide.create(slideData);
};

const updateSlide = async (id, slideData) => {
  return await HeroSlide.findByIdAndUpdate(id, slideData, { new: true });
};

const deleteSlide = async (id) => {
  return await HeroSlide.findByIdAndDelete(id);
};

module.exports = {
  getActiveSlides,
  getAllSlides,
  createSlide,
  updateSlide,
  deleteSlide,
};
