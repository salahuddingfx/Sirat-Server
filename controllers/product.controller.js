const productService = require("../service/product.service");
const cache = require("../config/cache.config");
const { getPublicUrl } = require("../config/multer.config");

const getProducts = async (req, res) => {
  try {
    const queryKey = JSON.stringify(req.query || {});
    const key = cache.buildKey("products", `list:${queryKey}`);
    const products = await cache.getOrSet(key, () => productService.getAllProducts(req.query), 60);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const key = cache.buildKey("products", `id:${req.params.id}`);
    const product = await cache.getOrSet(key, () => productService.getProductById(req.params.id), 60);
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
      productData.images = req.files.map((file) => getPublicUrl(req, file));
    }
    if (typeof productData.variants === "string") {
      productData.variants = JSON.parse(productData.variants);
    }
    const product = await productService.createProduct(productData);
    cache.invalidateNamespace("products");
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    if (typeof productData.variants === "string") {
      productData.variants = JSON.parse(productData.variants);
    }
    const existing = await productService.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Product not found" });

    let keepImages = [];
    if (req.body.keepImages) {
      keepImages = Array.isArray(req.body.keepImages) ? req.body.keepImages : JSON.parse(req.body.keepImages);
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => getPublicUrl(req, file));
      productData.images = [...keepImages, ...newImages];
    } else {
      productData.images = keepImages;
    }

    const product = await productService.updateProduct(req.params.id, productData);
    cache.invalidateNamespace("products");
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    cache.invalidateNamespace("products");
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const products = await cache.getOrSet(
      cache.buildKey("products", "featured"),
      () => productService.getFeaturedProducts(),
      60
    );
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBestSeller = async (req, res) => {
  try {
    const product = await cache.getOrSet(
      cache.buildKey("products", "best-seller"),
      () => productService.getBestSellerProduct(),
      60
    );
    if (!product) {
      return res.status(404).json({ success: false, message: "No best seller product found" });
    }
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
