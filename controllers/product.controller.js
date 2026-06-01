const productService = require("../service/product.service");

const getProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(req.query);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    if (req.files) {
      productData.images = req.files.map((file) => file.path);
    }
    const product = await productService.createProduct(productData);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map((file) => file.path);
    }
    const product = await productService.updateProduct(req.params.id, productData);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const products = await productService.getFeaturedProducts();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBestSeller = async (req, res) => {
  try {
    const product = await productService.getBestSellerProduct();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getBestSeller,
};
