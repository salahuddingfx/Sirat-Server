const { db } = require("../config/db.config");
const { product, category, productimage, productvariant, orderitem, order } = require("../db/schema");
const { eq, and, desc, sum, not } = require("drizzle-orm");
const crypto = require("crypto");

const getAllProducts = async (query = {}) => {
  let conditions = [];
  
  if (query.category) {
    const cat = await db.query.category.findFirst({
      where: eq(category.name, query.category),
    });
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

  return await db.query.product.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      images: true,
      variants: true,
      category: true,
    },
    orderBy: [desc(product.createdAt)],
  });
};

const getProductById = async (idOrSlug) => {
  let foundProduct = await db.query.product.findFirst({
    where: eq(product.id, idOrSlug),
    with: {
      images: true,
      variants: true,
      category: true,
    },
  });

  if (!foundProduct) {
    foundProduct = await db.query.product.findFirst({
      where: eq(product.slug, idOrSlug),
      with: {
        images: true,
        variants: true,
        category: true,
      },
    });
  }

  return foundProduct;
};

const createProduct = async (productData) => {
  const { images, variants, category: categoryName, categoryId: providedCategoryId, ...rest } = productData;

  return await db.transaction(async (tx) => {
    let categoryId = providedCategoryId;
    if (!categoryId && categoryName) {
      const cat = await tx.query.category.findFirst({ where: eq(category.name, categoryName) });
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

    return await tx.query.product.findFirst({
      where: eq(product.id, productId),
      with: {
        images: true,
        variants: true,
        category: true,
      },
    });
  });
};

const updateProduct = async (id, productData) => {
  const { images, variants, category: categoryName, categoryId: providedCategoryId, ...rest } = productData;

  return await db.transaction(async (tx) => {
    let categoryId = providedCategoryId;
    if (!categoryId && categoryName) {
      const cat = await tx.query.category.findFirst({ where: eq(category.name, categoryName) });
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

    return await tx.query.product.findFirst({
      where: eq(product.id, id),
      with: {
        images: true,
        variants: true,
        category: true,
      },
    });
  });
};

const deleteProduct = async (id) => {
  const deleted = await db.query.product.findFirst({
    where: eq(product.id, id),
  });
  if (deleted) {
    await db.delete(product).where(eq(product.id, id));
  }
  return deleted;
};

const getFeaturedProducts = async () => {
  return await db.query.product.findMany({
    where: and(
      eq(product.featured, true),
      eq(product.status, "Live")
    ),
    with: {
      images: true,
      variants: true,
      category: true,
    },
    orderBy: [desc(product.createdAt)],
  });
};

const getBestSellerProduct = async () => {
  const bestSellers = await db.select({
    productId: orderitem.productId,
    totalQty: sum(orderitem.quantity),
  })
  .from(orderitem)
  .innerJoin(order, eq(orderitem.orderId, order.id))
  .where(not(eq(order.status, "cancelled")))
  .groupBy(orderitem.productId)
  .orderBy(desc(sum(orderitem.quantity)))
  .limit(1);

  if (bestSellers.length > 0 && bestSellers[0].productId) {
    const foundProduct = await db.query.product.findFirst({
      where: eq(product.id, bestSellers[0].productId),
      with: {
        images: true,
        variants: true,
        category: true,
      },
    });
    if (foundProduct) return foundProduct;
  }

  return await db.query.product.findFirst({
    where: eq(product.status, "Live"),
    with: {
      images: true,
      variants: true,
      category: true,
    },
    orderBy: [desc(product.rating), desc(product.createdAt)],
  });
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