const { db } = require("../config/db.config");
const { product, category, productimage, productvariant, orderitem, order } = require("../db/schema");
const { eq, and, desc, sum, not, inArray } = require("drizzle-orm");
const crypto = require("crypto");

/**
 * Helper to populate category, images, and variants for a list of products
 */
const populateProducts = async (products, executor = db) => {
  if (products.length === 0) return [];
  const productIds = products.map((p) => p.id);

  // Fetch all images for these products
  const images = await executor.select()
    .from(productimage)
    .where(inArray(productimage.productId, productIds));

  // Fetch all variants for these products
  const variants = await executor.select()
    .from(productvariant)
    .where(inArray(productvariant.productId, productIds));

  // Fetch categories
  const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean))];
  const categories = categoryIds.length > 0
    ? await executor.select().from(category).where(inArray(category.id, categoryIds))
    : [];

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const imagesMap = new Map();
  const variantsMap = new Map();

  images.forEach((img) => {
    if (!imagesMap.has(img.productId)) imagesMap.set(img.productId, []);
    imagesMap.get(img.productId).push(img);
  });

  variants.forEach((v) => {
    if (!variantsMap.has(v.productId)) variantsMap.set(v.productId, []);
    variantsMap.get(v.productId).push(v);
  });

  return products.map((p) => ({
    ...p,
    category: categoryMap.get(p.categoryId) || null,
    images: imagesMap.get(p.id) || [],
    variants: variantsMap.get(p.id) || [],
  }));
};

const getAllProducts = async (query = {}) => {
  let conditions = [];
  
  if (query.category) {
    const [cat] = await db.select()
      .from(category)
      .where(eq(category.name, query.category))
      .limit(1);
    if (cat) {
      conditions.push(eq(product.categoryId, cat.id));
    } else {
      return [];
    }
  }

  if (query.featured !== undefined) {
    conditions.push(eq(product.featured, query.featured === "true" || query.featured === true));
  }

  if (query.status) {
    conditions.push(eq(product.status, query.status));
  }

  const products = await db.select()
    .from(product)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(product.createdAt));

  return await populateProducts(products);
};

const getProductById = async (idOrSlug) => {
  let [foundProduct] = await db.select()
    .from(product)
    .where(eq(product.id, idOrSlug))
    .limit(1);

  if (!foundProduct) {
    [foundProduct] = await db.select()
      .from(product)
      .where(eq(product.slug, idOrSlug))
      .limit(1);
  }

  if (!foundProduct) return null;

  const [populated] = await populateProducts([foundProduct]);
  return populated;
};

const createProduct = async (productData) => {
  const { images, variants, category: categoryName, categoryId: providedCategoryId, ...rest } = productData;

  return await db.transaction(async (tx) => {
    let categoryId = providedCategoryId;
    if (!categoryId && categoryName) {
      const [cat] = await tx.select().from(category).where(eq(category.name, categoryName)).limit(1);
      if (cat) {
        categoryId = cat.id;
      } else {
        const newCatId = crypto.randomUUID();
        await tx.insert(category).values({
          id: newCatId,
          name: categoryName,
          image: "",
        });
        categoryId = newCatId;
      }
    }

    if (!rest.slug && rest.name) {
      rest.slug = rest.name
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
    }

    const productId = crypto.randomUUID();
    await tx.insert(product).values({
      ...rest,
      id: productId,
      categoryId,
    });

    const finalImages = images || [];
    for (const imgUrl of finalImages) {
      await tx.insert(productimage).values({
        id: crypto.randomUUID(),
        url: imgUrl,
        productId,
      });
    }

    const finalVariants = variants && variants.length > 0
      ? variants.map((v) => ({
          id: crypto.randomUUID(),
          label: v.label,
          priceDelta: v.priceDelta || 0,
          stock: v.stock || 0,
          productId,
        }))
      : [{
          id: crypto.randomUUID(),
          label: "M",
          priceDelta: 0,
          stock: 10,
          productId,
        }];

    for (const v of finalVariants) {
      await tx.insert(productvariant).values(v);
    }

    const [created] = await tx.select().from(product).where(eq(product.id, productId)).limit(1);
    if (!created) return null;

    const [populated] = await populateProducts([created], tx);
    return populated;
  });
};

const updateProduct = async (id, productData) => {
  const { images, variants, category: categoryName, categoryId: providedCategoryId, ...rest } = productData;

  return await db.transaction(async (tx) => {
    let categoryId = providedCategoryId;
    if (!categoryId && categoryName) {
      const [cat] = await tx.select().from(category).where(eq(category.name, categoryName)).limit(1);
      if (cat) categoryId = cat.id;
    }

    const updatePayload = { ...rest };
    if (categoryId) updatePayload.categoryId = categoryId;

    await tx.update(product)
      .set(updatePayload)
      .where(eq(product.id, id));

    if (images) {
      await tx.delete(productimage).where(eq(productimage.productId, id));
      for (const imgUrl of images) {
        await tx.insert(productimage).values({
          id: crypto.randomUUID(),
          url: imgUrl,
          productId: id,
        });
      }
    }

    if (variants) {
      await tx.delete(productvariant).where(eq(productvariant.productId, id));
      for (const v of variants) {
        await tx.insert(productvariant).values({
          id: crypto.randomUUID(),
          label: v.label,
          priceDelta: v.priceDelta || 0,
          stock: v.stock || 0,
          productId: id,
        });
      }
    }

    const [updated] = await tx.select().from(product).where(eq(product.id, id)).limit(1);
    if (!updated) return null;

    const [populated] = await populateProducts([updated], tx);
    return populated;
  });
};

const deleteProduct = async (id) => {
  const [deleted] = await db.select().from(product).where(eq(product.id, id)).limit(1);
  if (deleted) {
    await db.delete(product).where(eq(product.id, id));
  }
  return deleted;
};

const getFeaturedProducts = async () => {
  const products = await db.select()
    .from(product)
    .where(and(
      eq(product.featured, true),
      eq(product.status, "Live")
    ))
    .orderBy(desc(product.createdAt));

  return await populateProducts(products);
};

const getBestSellerProduct = async () => {
  const bestSellers = await db.select({
    productId: orderitem.productId,
  })
  .from(orderitem)
  .innerJoin(order, eq(orderitem.orderId, order.id))
  .where(not(eq(order.status, "cancelled")))
  .groupBy(orderitem.productId)
  .orderBy(desc(sum(orderitem.quantity)))
  .limit(1);

  if (bestSellers.length > 0 && bestSellers[0].productId) {
    const [foundProduct] = await db.select()
      .from(product)
      .where(eq(product.id, bestSellers[0].productId))
      .limit(1);

    if (foundProduct) {
      const [populated] = await populateProducts([foundProduct]);
      return populated;
    }
  }

  const [fallbackProduct] = await db.select()
    .from(product)
    .where(eq(product.status, "Live"))
    .orderBy(desc(product.rating), desc(product.createdAt))
    .limit(1);

  if (fallbackProduct) {
    const [populated] = await populateProducts([fallbackProduct]);
    return populated;
  }

  return null;
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getBestSellerProduct,
  populateProducts,
};