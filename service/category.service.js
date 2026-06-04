const { db } = require("../config/db.config");
const { category } = require("../db/schema");
const { eq, asc } = require("drizzle-orm");
const crypto = require("crypto");

const getAllCategories = async () => {
  return await db.select().from(category).orderBy(asc(category.name));
};

const getCategoryById = async (id) => {
  const [cat] = await db.select().from(category).where(eq(category.id, id)).limit(1);
  return cat || null;
};

const createCategory = async (categoryData) => {
  const catId = crypto.randomUUID();
  await db.insert(category).values({
    id: catId,
    ...categoryData,
  });
  return await getCategoryById(catId);
};

const updateCategory = async (id, categoryData) => {
  await db.update(category)
    .set(categoryData)
    .where(eq(category.id, id));
  return await getCategoryById(id);
};

const deleteCategory = async (id) => {
  const deleted = await getCategoryById(id);
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