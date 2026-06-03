const { prisma } = require("../config/db.config");

const getActiveSlides = async () => {
  return await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
};

const getAllSlides = async () => {
  return await prisma.heroSlide.findMany({
    orderBy: { order: "asc" },
  });
};

const createSlide = async (slideData) => {
  return await prisma.heroSlide.create({
    data: slideData,
  });
};

const updateSlide = async (id, slideData) => {
  return await prisma.heroSlide.update({
    where: { id },
    data: slideData,
  });
};

const deleteSlide = async (id) => {
  return await prisma.heroSlide.delete({
    where: { id },
  });
};

module.exports = {
  getActiveSlides,
  getAllSlides,
  createSlide,
  updateSlide,
  deleteSlide,
};