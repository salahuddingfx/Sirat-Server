const { db } = require("../config/db.config");
const { category } = require("../db/schema");
const { eq, asc } = require("drizzle-orm");
const crypto = require("crypto");

const getAllCategories = async () => {
  return await db.query.category.findMany({
    orderBy: [asc(category.name)],
  });
};

const getCategoryById = async (id) => {
  return await db.query.category.findFirst({
    where: eq(category.id, id),
  });
};

const createCategory = async (categoryData) => {
  const catId = crypto.randomUUID();
  await db.insert(category).values({
    id: catId,
    ...categoryData,
  });
  return await db.query.category.findFirst({
    where: eq(category.id, catId),
  });
};

const updateCategory = async (id, categoryData) => {
  await db.update(category)
    .set(categoryData)
    .where(eq(category.id, id));
  return await db.query.category.findFirst({
    where: eq(category.id, id),
  });
};

const deleteCategory = async (id) => {
  const deleted = await db.query.category.findFirst({
    where: eq(category.id, id),
  });
  if (deleted) {
    await db.delete(category).where(eq(category.id, id));
  }
  return deleted;
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};