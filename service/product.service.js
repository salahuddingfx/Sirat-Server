const { prisma } = require("../config/db.config");

const getAllProducts = async (query = {}) => {
  // Simple mapping of some common mongoose query patterns to prisma where
  let where = {};
  if (query.category) {
    where.category = { name: query.category };
  }
  if (query.featured !== undefined) {
    where.featured = query.featured === "true" || query.featured === true;
  }
  if (query.status) {
    where.status = query.status;
  }

  return await prisma.product.findMany({
    where,
    include: {
      images: true,
      variants: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getProductById = async (idOrSlug) => {
  // Try to find by ID first
  let product = await prisma.product.findUnique({
    where: { id: idOrSlug },
    include: {
      images: true,
      variants: true,
      category: true,
    },
  });

  if (!product) {
    // If not found, try by slug
    product = await prisma.product.findUnique({
      where: { slug: idOrSlug },
      include: {
        images: true,
        variants: true,
        category: true,
      },
    });
  }

  return product;
};

const createProduct = async (productData) => {
  const { images, variants, category, categoryId: providedCategoryId, ...rest } = productData;

  let categoryId = providedCategoryId;
  if (!categoryId && category) {
    const cat = await prisma.category.findUnique({ where: { name: category } });
    if (cat) {
      categoryId = cat.id;
    } else {
      const newCat = await prisma.category.create({
        data: { name: category, image: "" },
      });
      categoryId = newCat.id;
    }
  }

  if (!rest.slug && rest.name) {
    rest.slug = rest.name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  }

  return await prisma.product.create({
    data: {
      ...rest,
      categoryId,
      images: {
        create: (images || []).map((url) => ({ url })),
      },
      variants: {
        create:
          variants && variants.length > 0
            ? variants.map((v) => ({
                label: v.label,
                priceDelta: v.priceDelta || 0,
                stock: v.stock || 0,
              }))
            : [{ label: "M", priceDelta: 0, stock: 10 }],
      },
    },
    include: {
      images: true,
      variants: true,
      category: true,
    },
  });
};

const updateProduct = async (id, productData) => {
  const { images, variants, category, categoryId: providedCategoryId, ...rest } = productData;

  let updatePayload = { ...rest };

  if (providedCategoryId) {
    updatePayload.categoryId = providedCategoryId;
  } else if (category) {
    const cat = await prisma.category.findUnique({ where: { name: category } });
    if (cat) updatePayload.categoryId = cat.id;
  }

  if (images) {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    updatePayload.images = {
      create: images.map((url) => ({ url })),
    };
  }

  if (variants) {
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    updatePayload.variants = {
      create: variants.map((v) => ({
        label: v.label,
        priceDelta: v.priceDelta || 0,
        stock: v.stock || 0,
      })),
    };
  }

  return await prisma.product.update({
    where: { id },
    data: updatePayload,
    include: {
      images: true,
      variants: true,
      category: true,
    },
  });
};

const deleteProduct = async (id) => {
  return await prisma.product.delete({
    where: { id },
  });
};

const getFeaturedProducts = async () => {
  return await prisma.product.findMany({
    where: { featured: true, status: "Live" },
    include: {
      images: true,
      variants: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getBestSellerProduct = async () => {
  const bestSellers = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
    },
    where: {
      order: {
        status: { not: "cancelled" },
      },
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 1,
  });

  if (bestSellers.length > 0 && bestSellers[0].productId) {
    const product = await prisma.product.findUnique({
      where: { id: bestSellers[0].productId },
      include: {
        images: true,
        variants: true,
        category: true,
      },
    });
    if (product) return product;
  }

  return await prisma.product.findFirst({
    where: { status: "Live" },
    include: {
      images: true,
      variants: true,
      category: true,
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
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