const { db } = require("../config/db.config");
const { flashsale, flashsaleproducts } = require("../db/schema");
const { eq, lte, gte, and, desc } = require("drizzle-orm");
const crypto = require("crypto");

const getActiveFlashSale = async () => {
  const sale = await db.query.flashsale.findFirst({
    where: and(
      eq(flashsale.isActive, true),
      lte(flashsale.startDate, new Date()),
      gte(flashsale.endDate, new Date())
    ),
    with: {
      flashsaleproducts: {
        with: {
          product: {
            with: {
              images: true,
              variants: true,
              category: true,
            },
          },
        },
      },
    },
    orderBy: [desc(flashsale.createdAt)],
  });

  if (!sale) return null;

  const productsList = sale.flashsaleproducts
    ? sale.flashsaleproducts.map((fp) => fp.product).filter(Boolean)
    : [];

  const saleToReturn = {
    ...sale,
    products: productsList,
  };
  delete saleToReturn.flashsaleproducts;

  const remaining = Math.max(0, Math.floor((new Date(sale.endDate).getTime() - Date.now()) / 1000));
  return { ...saleToReturn, remainingSeconds: remaining };
};

const getFlashSale = async () => {
  const sale = await db.query.flashsale.findFirst({
    with: {
      flashsaleproducts: {
        with: {
          product: true,
        },
      },
    },
    orderBy: [desc(flashsale.createdAt)],
  });

  if (!sale) return null;

  const productsList = sale.flashsaleproducts
    ? sale.flashsaleproducts.map((fp) => fp.product).filter(Boolean)
    : [];

  const saleToReturn = {
    ...sale,
    products: productsList,
  };
  delete saleToReturn.flashsaleproducts;
  return saleToReturn;
};

const upsertFlashSale = async (data) => {
  const sale = await db.query.flashsale.findFirst();
  
  const { products: productIds, ...rest } = data;
  const restWithDates = { ...rest };
  if (restWithDates.startDate) restWithDates.startDate = new Date(restWithDates.startDate);
  if (restWithDates.endDate) restWithDates.endDate = new Date(restWithDates.endDate);

  return await db.transaction(async (tx) => {
    let saleId;
    if (sale) {
      saleId = sale.id;
      await tx.update(flashsale)
        .set(restWithDates)
        .where(eq(flashsale.id, saleId));
    } else {
      saleId = crypto.randomUUID();
      await tx.insert(flashsale).values({
        id: saleId,
        ...restWithDates,
      });
    }

    if (productIds && Array.isArray(productIds)) {
      await tx.delete(flashsaleproducts).where(eq(flashsaleproducts.A, saleId));
      for (const pId of productIds) {
        await tx.insert(flashsaleproducts).values({
          A: saleId,
          B: pId,
        });
      }
    }

    const updatedSale = await tx.query.flashsale.findFirst({
      where: eq(flashsale.id, saleId),
      with: {
        flashsaleproducts: {
          with: {
            product: true,
          },
        },
      },
    });

    const productsList = updatedSale.flashsaleproducts
      ? updatedSale.flashsaleproducts.map((fp) => fp.product).filter(Boolean)
      : [];

    const saleToReturn = {
      ...updatedSale,
      products: productsList,
    };
    delete saleToReturn.flashsaleproducts;
    return saleToReturn;
  });
};

const toggleFlashSale = async () => {
  const sale = await db.query.flashsale.findFirst();
  if (!sale) return null;
  
  await db.update(flashsale)
    .set({ isActive: !sale.isActive })
    .where(eq(flashsale.id, sale.id));

  return await db.query.flashsale.findFirst({
    where: eq(flashsale.id, sale.id),
  });
};

module.exports = { getActiveFlashSale, getFlashSale, upsertFlashSale, toggleFlashSale };
