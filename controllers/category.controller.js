const Category = require("../models/category.model");
const cache = require("../config/cache.config");

const getCategories = async (req, res) => {
  try {
    const categories = await cache.getOrSet(
      cache.buildKey("categories", "list"),
      () => Category.find().sort({ name: 1 }),
      120
    );
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const featured = req.body.featured === "true" || req.body.featured === true;
    let image = "";
    if (req.file) {
      image = req.file.path; // Cloudinary URL populated by multer
    } else {
      return res.status(400).json({ success: false, message: "Category image is required." });
    }
    const category = await Category.create({ name, image, featured });
    cache.invalidateNamespace("categories");
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const featured = req.body.featured === "true" || req.body.featured === true;
    const updateData = { name, featured };
    if (req.file) {
      updateData.image = req.file.path;
    }
    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    cache.invalidateNamespace("categories");
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    cache.invalidateNamespace("categories");
    res.status(200).json({ success: true, message: "Category deleted successfully." });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
