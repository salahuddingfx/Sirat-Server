const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Order = require("../models/order.model");
const crypto = require("crypto");

/**
 * Normalizes product data to correct database types (handling empty strings and string-encoded numbers/booleans)
 */
const normalizeProductData = (data) => {
  const normalized = { ...data };

  const toFloat = (val, fallback = null) => {
    if (val === undefined) return undefined;
    if (val === null || val === "") return fallback;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  };

  const toInt = (val, fallback = 0) => {
    if (val === undefined) return undefined;
    if (val === null || val === "") return fallback;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  if (data.price !== undefined) normalized.price = toFloat(data.price, 0);
  if (data.oldPrice !== undefined) normalized.oldPrice = toFloat(data.oldPrice, null);
  if (data.costPrice !== undefined) normalized.costPrice = toFloat(data.costPrice, 0);
  if (data.packagingCost !== undefined) normalized.packagingCost = toFloat(data.packagingCost, 0);
  if (data.managementCost !== undefined) normalized.managementCost = toFloat(data.managementCost, 0);
  if (data.otherCost !== undefined) normalized.otherCost = toFloat(data.otherCost, 0);
  if (data.stock !== undefined) normalized.stock = toInt(data.stock, 0);
  if (data.weight !== undefined) normalized.weight = toFloat(data.weight, 0.35);
  if (data.rating !== undefined) normalized.rating = toFloat(data.rating, 0);

  if (data.featured !== undefined) {
    normalized.featured = data.featured === "true" || data.featured === true;
  }

  return normalized;
};

/**
 * Maps Product object to return client-compatible keys (e.g. id and _id, category as nested object)
 */
const formatProduct = (p) => {
  if (!p) return null;
  const obj = p.toObject ? p.toObject() : p;
  obj.id = obj._id;
  if (obj.categoryId && typeof obj.categoryId === "object") {
    obj.category = {
      ...obj.categoryId,
      id: obj.categoryId._id,
    };
    obj.categoryId = obj.categoryId._id;
  }
  if (obj.variants) {
    obj.variants = obj.variants.map((v) => ({ ...v, id: v._id }));
  }
  return obj;
};

const getAllProducts = async (query = {}) => {
  const filter = {};
  
  if (query.category) {
    const cat = await Category.findOne({ name: query.category });
    if (cat) {
      filter.categoryId = cat._id;
    } else {
      return [];
    }
  }

  if (query.featured !== undefined) {
    filter.featured = query.featured === "true" || query.featured === true;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const products = await Product.find(filter)
    .populate("categoryId")
    .sort({ createdAt: -1 });

  return products.map(formatProduct);
};

const getProductById = async (idOrSlug) => {
  let foundProduct = null;
  if (idOrSlug && idOrSlug.match(/^[0-9a-fA-F-]{36}$/)) {
    // If it's a UUID string
    foundProduct = await Product.findById(idOrSlug).populate("categoryId");
  }

  if (!foundProduct) {
    foundProduct = await Product.findOne({ slug: idOrSlug }).populate("categoryId");
  }

  if (!foundProduct && idOrSlug) {
    // fallback attempt to search by ID directly
    foundProduct = await Product.findById(idOrSlug).populate("categoryId");
  }

  return formatProduct(foundProduct);
};

const createProduct = async (productData) => {
  const normalized = normalizeProductData(productData);
  const { images, variants, category: categoryName, categoryId: providedCategoryId, ...rest } = normalized;

  let categoryId = providedCategoryId;
  if (!categoryId && categoryName) {
    const cat = await Category.findOne({ name: categoryName });
    if (cat) {
      categoryId = cat._id;
    } else {
      const newCat = await Category.create({
        name: categoryName,
      });
      categoryId = newCat._id;
    }
  }

  if (!categoryId) {
    throw new Error("Category is required.");
  }

  if (!rest.slug && rest.name) {
    rest.slug = rest.name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  }

  const finalVariants = variants && variants.length > 0
    ? variants.map((v) => ({
        label: v.label,
        priceDelta: parseFloat(v.priceDelta) || 0,
        stock: parseInt(v.stock, 10) || 0,
      }))
    : [{
        label: "M",
        priceDelta: 0,
        stock: 10,
      }];

  const created = await Product.create({
    ...rest,
    categoryId,
    images: (images || []).map((img) => typeof img === "string" ? { url: img } : img),
    variants: finalVariants,
  });

  const populated = await Product.findById(created._id).populate("categoryId");
  return formatProduct(populated);
};

const updateProduct = async (id, productData) => {
  const normalized = normalizeProductData(productData);
  const { images, variants, category: categoryName, categoryId: providedCategoryId, ...rest } = normalized;

  let categoryId = providedCategoryId;
  if (!categoryId && categoryName) {
    const cat = await Category.findOne({ name: categoryName });
    if (cat) categoryId = cat._id;
  }

  const updatePayload = { ...rest };
  if (categoryId) updatePayload.categoryId = categoryId;
  if (images !== undefined) {
    updatePayload.images = images.map((img) => typeof img === "string" ? { url: img } : img);
  }
  if (variants !== undefined) {
    updatePayload.variants = variants.map((v) => ({
      label: v.label,
      priceDelta: parseFloat(v.priceDelta) || 0,
      stock: parseInt(v.stock, 10) || 0,
    }));
  }

  // Filter out undefined values
  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  const updated = await Product.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true }
  ).populate("categoryId");

  return formatProduct(updated);
};

const deleteProduct = async (id) => {
  const deleted = await Product.findByIdAndDelete(id);
  return formatProduct(deleted);
};

const getFeaturedProducts = async () => {
  const products = await Product.find({
    featured: true,
    status: "Live"
  })
  .populate("categoryId")
  .sort({ createdAt: -1 });

  return products.map(formatProduct);
};

const getBestSellerProduct = async () => {
  const bestSellers = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.productId", totalQty: { $sum: "$items.quantity" } } },
    { $sort: { totalQty: -1 } },
    { $limit: 1 }
  ]);

  if (bestSellers.length > 0 && bestSellers[0]._id) {
    const foundProduct = await Product.findById(bestSellers[0]._id).populate("categoryId");
    if (foundProduct) {
      return formatProduct(foundProduct);
    }
  }

  // Fallback to highest rated live product
  const fallbackProduct = await Product.findOne({ status: "Live" })
    .populate("categoryId")
    .sort({ rating: -1, createdAt: -1 });

  return formatProduct(fallbackProduct);
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getBestSellerProduct,
};