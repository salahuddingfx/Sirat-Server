const Product = require("../models/product.model");
const Order = require("../models/order.model");

const getAllProducts = async (query = {}) => {
  return await Product.find(query).sort({ createdAt: -1 });
};

const getProductById = async (id) => {
  return await Product.findById(id);
};

const createProduct = async (productData) => {
  return await Product.create(productData);
};

const updateProduct = async (id, productData) => {
  return await Product.findByIdAndUpdate(id, productData, { new: true });
};

const deleteProduct = async (id) => {
  return await Product.findByIdAndDelete(id);
};

const getFeaturedProducts = async () => {
  return await Product.find({ featured: true, status: "Live" }).sort({ createdAt: -1 });
};

const getBestSellerProduct = async () => {
  const bestSellers = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 1 },
  ]);

  if (bestSellers.length > 0 && bestSellers[0]._id) {
    const product = await Product.findById(bestSellers[0]._id);
    if (product) return product;
  }

  // Fallback: return the first live product with the highest rating
  return await Product.findOne({ status: "Live" }).sort({ rating: -1, createdAt: -1 });
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