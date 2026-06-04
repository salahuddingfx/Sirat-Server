const { db } = require("../config/db.config");
const { wishlist, product, productimage } = require("../db/schema");
const { eq, and, inArray, desc } = require("drizzle-orm");
const crypto = require("crypto");

const getWishlist = async (userId) => {
  const items = await db.select()
    .from(wishlist)
    .where(eq(wishlist.userId, userId))
    .orderBy(desc(wishlist.createdAt));

  const productIds = items.map(w => w.productId);
  if (productIds.length === 0) return [];

  const products = await db.select().from(product).where(inArray(product.id, productIds));
  const productMap = new Map(products.map(p => [p.id, p]));

  const images = await db.select().from(productimage).where(inArray(productimage.productId, productIds));
  const imageMap = new Map();
  images.forEach(img => {
    if (!imageMap.has(img.productId)) imageMap.set(img.productId, []);
    imageMap.get(img.productId).push(img);
  });

  return items.map(w => ({
    wishlistId: w.id,
    product: {
      ...productMap.get(w.productId),
      images: imageMap.get(w.productId) || [],
    },
    addedAt: w.createdAt,
  }));
};

const addToWishlist = async (userId, productId) => {
  const [existing] = await db.select()
    .from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)))
    .limit(1);

  if (existing) return { message: "Already in wishlist", id: existing.id };

  const id = crypto.randomUUID();
  await db.insert(wishlist).values({ id, userId, productId });
  return { message: "Added to wishlist", id };
};

const removeFromWishlist = async (userId, productId) => {
  await db.delete(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));
  return { message: "Removed from wishlist" };
};

const isWishlisted = async (userId, productId) => {
  const [item] = await db.select({ id: wishlist.id })
    .from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)))
    .limit(1);
  return !!item;
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist, isWishlisted };
