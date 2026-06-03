const { prisma } = require("../config/db.config");

const getActiveFlashSale = async () => {
  const sale = await prisma.flashSale.findFirst({
    where: {
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    include: {
      products: {
        include: {
          images: true,
          variants: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!sale) return null;

  const remaining = Math.max(0, Math.floor((new Date(sale.endDate).getTime() - Date.now()) / 1000));
  return { ...sale, remainingSeconds: remaining };
};

const getFlashSale = async () => {
  return await prisma.flashSale.findFirst({
    include: {
      products: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const upsertFlashSale = async (data) => {
  let sale = await prisma.flashSale.findFirst();
  
  const { products, ...rest } = data;
  const productConnect = products ? {
    set: products.map(id => ({ id }))
  } : undefined;

  if (sale) {
    return await prisma.flashSale.update({
      where: { id: sale.id },
      data: {
        ...rest,
        products: productConnect
      },
      include: { products: true }
    });
  }

  return await prisma.flashSale.create({
    data: {
      ...rest,
      products: productConnect
    },
    include: { products: true }
  });
};

const toggleFlashSale = async () => {
  let sale = await prisma.flashSale.findFirst();
  if (!sale) return null;
  
  return await prisma.flashSale.update({
    where: { id: sale.id },
    data: { isActive: !sale.isActive }
  });
};

module.exports = { getActiveFlashSale, getFlashSale, upsertFlashSale, toggleFlashSale };
