const { db } = require("../config/db.config");
const { cart } = require("../db/schema");
const { eq } = require("drizzle-orm");
const crypto = require("crypto");

const getCart = async (userId) => {
  const [found] = await db.select().from(cart).where(eq(cart.userId, userId)).limit(1);
  if (!found) return { items: [] };
  try {
    return { items: JSON.parse(found.items || "[]") };
  } catch {
    return { items: [] };
  }
};

const saveCart = async (userId, items) => {
  const [existing] = await db.select({ id: cart.id }).from(cart).where(eq(cart.userId, userId)).limit(1);
  const itemsJson = JSON.stringify(items || []);

  if (existing) {
    await db.update(cart).set({ items: itemsJson }).where(eq(cart.userId, userId));
  } else {
    await db.insert(cart).values({ id: crypto.randomUUID(), userId, items: itemsJson });
  }
  return { items };
};

const clearCart = async (userId) => {
  await db.delete(cart).where(eq(cart.userId, userId));
  return { items: [] };
};

module.exports = { getCart, saveCart, clearCart };
