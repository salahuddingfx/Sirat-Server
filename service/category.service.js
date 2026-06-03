const { prisma } = require("../config/db.config");

const getAllCategories = async () => {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
};

const getCategoryById = async (id) => {
  return await prisma.category.findUnique({
    where: { id },
  });
};

const createCategory = async (categoryData) => {
  return await prisma.category.create({
    data: categoryData,
  });
};

const updateCategory = async (id, categoryData) => {
  return await prisma.category.update({
    where: { id },
    data: categoryData,
  });
};

const deleteCategory = async (id) => {
  return await prisma.category.delete({
    where: { id },
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};