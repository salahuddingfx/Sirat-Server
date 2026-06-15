const Category = require("../models/category.model");

const formatCategory = (cat) => {
  if (!cat) return null;
  const obj = cat.toObject ? cat.toObject() : cat;
  obj.id = obj._id;
  return obj;
};

const getAllCategories = async () => {
  const cats = await Category.find().sort({ name: 1 });
  return cats.map(formatCategory);
};

const getCategoryById = async (id) => {
  const cat = await Category.findById(id);
  return formatCategory(cat);
};

const createCategory = async (categoryData) => {
  const cat = await Category.create(categoryData);
  return formatCategory(cat);
};

const updateCategory = async (id, categoryData) => {
  const updated = await Category.findByIdAndUpdate(
    id,
    { $set: categoryData },
    { new: true }
  );
  return formatCategory(updated);
};

const deleteCategory = async (id) => {
  const deleted = await Category.findByIdAndDelete(id);
  return formatCategory(deleted);
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};