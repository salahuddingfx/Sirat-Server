const Wishlist = require("../models/wishlist.model");
const Product = require("../models/product.model");

// Format product images mapping for frontend compatibility
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
  if (obj.images) {
    obj.images = obj.images.map((img) => typeof img === "string" ? { url: img } : img);
  }
  return obj;
};

const getWishlist = async (userId) => {
  const items = await Wishlist.find({ userId })
    .populate({
      path: "productId",
      populate: { path: "categoryId" }
    })
    .sort({ createdAt: -1 });

  return items.map((w) => {
    const itemObj = w.toObject();
    const prodObj = formatProduct(w.productId);
    
    return {
      wishlistId: itemObj._id,
      product: prodObj ? {
        ...prodObj,
        images: (prodObj.images || []).map((img) => img.url || img),
      } : null,
      addedAt: itemObj.createdAt,
    };
  });
};

const addToWishlist = async (userId, productId) => {
  const existing = await Wishlist.findOne({ userId, productId });

  if (existing) {
    return { message: "Already in wishlist", id: existing._id };
  }

  const created = await Wishlist.create({ userId, productId });
  return { message: "Added to wishlist", id: created._id };
};

const removeFromWishlist = async (userId, productId) => {
  await Wishlist.deleteOne({ userId, productId });
  return { message: "Removed from wishlist" };
};

const isWishlisted = async (userId, productId) => {
  const item = await Wishlist.findOne({ userId, productId });
  return !!item;
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, isWishlisted };
