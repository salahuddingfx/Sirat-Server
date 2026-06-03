const { db } = require("../config/db.config");
const { flashsale, flashsaleproducts, product: productTable } = require("../db/schema");
const { eq, lte, gte, and, desc, inArray } = require("drizzle-orm");
const crypto = require("crypto");
const productService = require("./product.service");

const getActiveFlashSale = async () => {
  const [sale] = await db.select()
    .from(flashsale)
    .where(and(
      eq(flashsale.isActive, true),
      lte(flashsale.startDate, new Date()),
      gte(flashsale.endDate, new Date())
    ))
    .orderBy(desc(flashsale.createdAt))
    .limit(1);

  if (!sale) return null;

  const fpRows = await db.select({ productId: flashsaleproducts.B })
    .from(flashsaleproducts)
    .where(eq(flashsaleproducts.A, sale.id));

  const productIds = fpRows.map((row) => row.productId);
  let productsList = [];
  if (productIds.length > 0) {
    const rawProducts = await db.select().from(productTable).where(inArray(productTable.id, productIds));
    productsList = await productService.populateProducts(rawProducts);
  }

  const saleToReturn = {
    ...sale,
    products: productsList,
  };

  const remaining = Math.max(0, Math.floor((new Date(sale.endDate).getTime() - Date.now()) / 1000));
  return { ...saleToReturn, remainingSeconds: remaining };
};

const getFlashSale = async () => {
  const [sale] = await db.select()
    .from(flashsale)
    .orderBy(desc(flashsale.createdAt))
    .limit(1);

  if (!sale) return null;

  const fpRows = await db.select({ productId: flashsaleproducts.B })
    .from(flashsaleproducts)
    .where(eq(flashsaleproducts.A, sale.id));

  const productIds = fpRows.map((row) => row.productId);
  let productsList = [];
  if (productIds.length > 0) {
    const rawProducts = await db.select().from(productTable).where(inArray(productTable.id, productIds));
    productsList = await productService.populateProducts(rawProducts);
  }

  const saleToReturn = {
    ...sale,
    products: productsList,
  };
  return saleToReturn;
};

const upsertFlashSale = async (data) => {
  const [sale] = await db.select().from(flashsale).limit(1);
  
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

    const [updatedSale] = await tx.select().from(flashsale).where(eq(flashsale.id, saleId)).limit(1);
    if (!updatedSale) return null;

    const fpRows = await tx.select({ productId: flashsaleproducts.B })
      .from(flashsaleproducts)
      .where(eq(flashsaleproducts.A, saleId));

    const updatedProductIds = fpRows.map((row) => row.productId);
    let productsList = [];
    if (updatedProductIds.length > 0) {
      const rawProducts = await tx.select().from(productTable).where(inArray(productTable.id, updatedProductIds));
      productsList = await productService.populateProducts(rawProducts, tx);
    }

    const saleToReturn = {
      ...updatedSale,
      products: productsList,
    };
    return saleToReturn;
  });
};

const toggleFlashSale = async () => {
  const [sale] = await db.select().from(flashsale).limit(1);
  if (!sale) return null;
  
  await db.update(flashsale)
    .set({ isActive: !sale.isActive })
    .where(eq(flashsale.id, sale.id));

  const [updated] = await db.select().from(flashsale).where(eq(flashsale.id, sale.id)).limit(1);
  return updated;
};

module.exports = { getActiveFlashSale, getFlashSale, upsertFlashSale, toggleFlashSale };
