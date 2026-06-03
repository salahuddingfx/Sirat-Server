const categoryService = require("../service/category.service");
const cache = require("../config/cache.config");
const { getPublicUrl } = require("../config/multer.config");

const getCategories = async (req, res) => {
  try {
    const categories = await cache.getOrSet(
      cache.buildKey("categories", "list"),
      () => categoryService.getAllCategories(),
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
      image = getPublicUrl(req, req.file);
    } else {
      return res.status(400).json({ success: false, message: "Category image is required." });
    }
    const category = await categoryService.createCategory({ name, image, featured });
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
      updateData.image = getPublicUrl(req, req.file);
    }
    const category = await categoryService.updateCategory(req.params.id, updateData);
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
    const category = await categoryService.deleteCategory(req.params.id);
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
