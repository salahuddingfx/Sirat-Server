const { db } = require("../config/db.config");
const { heroslide } = require("../db/schema");
const { eq, asc } = require("drizzle-orm");
const crypto = require("crypto");

const getActiveSlides = async () => {
  return await db.query.heroslide.findMany({
    where: eq(heroslide.isActive, true),
    orderBy: [asc(heroslide.order)],
  });
};

const getAllSlides = async () => {
  return await db.query.heroslide.findMany({
    orderBy: [asc(heroslide.order)],
  });
};

const createSlide = async (slideData) => {
  const slideId = crypto.randomUUID();
  await db.insert(heroslide).values({
    id: slideId,
    ...slideData,
  });
  return await db.query.heroslide.findFirst({
    where: eq(heroslide.id, slideId),
  });
};

const updateSlide = async (id, slideData) => {
  await db.update(heroslide)
    .set(slideData)
    .where(eq(heroslide.id, id));
  return await db.query.heroslide.findFirst({
    where: eq(heroslide.id, id),
  });
};

const deleteSlide = async (id) => {
  const deleted = await db.query.heroslide.findFirst({
    where: eq(heroslide.id, id),
  });
  if (deleted) {
    await db.delete(heroslide).where(eq(heroslide.id, id));
  }
  return deleted;
};

module.exports = {
  getActiveSlides,
  getAllSlides,
  createSlide,
  updateSlide,
  deleteSlide,
};