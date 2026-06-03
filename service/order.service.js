const { db } = require("../config/db.config");
const { order, orderitem, productvariant, counter } = require("../db/schema");
const { eq, and, desc, sql } = require("drizzle-orm");
const crypto = require("crypto");

/**
 * Helper to generate atomic sequential IDs
 */
const getNextSequenceValue = async (tx, sequenceName) => {
  await tx.insert(counter)
    .values({ id: crypto.randomUUID(), name: sequenceName, count: 1 })
    .onDuplicateKeyUpdate({
      set: { count: sql`count + 1` }
    });

  const result = await tx.query.counter.findFirst({
    where: eq(counter.name, sequenceName),
  });
  return result.count;
};

const createOrder = async (orderData) => {
  try {
    return await db.transaction(async (tx) => {
      // 1. Validate & Decrement stock for all items
      for (const item of orderData.items) {
        const variant = await tx.query.productvariant.findFirst({
          where: and(
            eq(productvariant.productId, item.product),
            eq(productvariant.label, item.variant)
          ),
          with: { product: true },
        });

        if (!variant) throw new Error(`Variant "${item.variant}" not found.`);
        if (variant.stock < item.quantity) {
          throw new Error(
            `"${variant.product.name}" (Size: ${item.variant}) has insufficient stock. Available: ${variant.stock}, Requested: ${item.quantity}`
          );
        }

        // Decrement stock
        await tx.update(productvariant)
          .set({ stock: sql`stock - ${item.quantity}` })
          .where(eq(productvariant.id, variant.id));
      }

      // 2. Generate unique sequential order ID
      const seq = await getNextSequenceValue(tx, "orderId");
      const orderIdString = `SRT-${1000 + seq}`;

      // 3. Create Order
      const orderUuid = crypto.randomUUID();
      await tx.insert(order).values({
        id: orderUuid,
        orderId: orderIdString,
        userId: orderData.user || null,
        guestName: orderData.guestInfo?.name || null,
        guestEmail: orderData.guestInfo?.email || null,
        guestPhone: orderData.guestInfo?.phone || null,
        guestAddress: orderData.guestInfo?.address || null,
        guestCity: orderData.guestInfo?.city || null,
        guestZipCode: orderData.guestInfo?.zipCode || null,
        shippingCharge: orderData.shippingCharge,
        totalAmount: orderData.totalAmount,
        paymentMethod: orderData.paymentMethod,
        senderNumber: orderData.paymentDetails?.senderNumber || null,
        txId: orderData.paymentDetails?.txId || null,
      });

      // 4. Create Order Items
      for (const item of orderData.items) {
        await tx.insert(orderitem).values({
          id: crypto.randomUUID(),
          productId: item.product,
          quantity: item.quantity,
          variant: item.variant,
          price: item.price,
          orderId: orderUuid,
        });
      }

      // 5. Fetch and return created order with relation mappings
      return await tx.query.order.findFirst({
        where: eq(order.id, orderUuid),
        with: {
          orderitem: {
            with: { product: true },
          },
          user: {
            columns: { name: true, email: true, phone: true },
          },
        },
      });
    });
  } catch (error) {
    throw error;
  }
};

const getOrders = async (query = {}) => {
  const conditions = [];
  if (query.user) conditions.push(eq(order.userId, query.user));
  if (query.status) conditions.push(eq(order.status, query.status));

  return await db.query.order.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      orderitem: {
        with: { product: true },
      },
      user: {
        columns: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: [desc(order.createdAt)],
  });
};

const getOrderById = async (id) => {
  return await db.query.order.findFirst({
    where: eq(order.id, id),
    with: {
      orderitem: {
        with: { product: true },
      },
      user: {
        columns: { id: true, name: true, email: true, phone: true },
      },
    },
  });
};

const updateOrderStatus = async (id, status) => {
  try {
    return await db.transaction(async (tx) => {
      const foundOrder = await tx.query.order.findFirst({
        where: eq(order.id, id),
        with: { orderitem: true },
      });
      if (!foundOrder) throw new Error("Order not found");

      const oldStatus = foundOrder.status;
      const cancels = ["cancelled", "returned"];
      const goingToCancel = cancels.includes(status);
      const wasCanceled = cancels.includes(oldStatus);

      // Transitioning to cancelled/returned: Restore stock
      if (goingToCancel && !wasCanceled) {
        for (const item of foundOrder.orderitem) {
          await tx.update(productvariant)
            .set({ stock: sql`stock + ${item.quantity}` })
            .where(and(
              eq(productvariant.productId, item.productId),
              eq(productvariant.label, item.variant)
            ));
        }
      }
      // Transitioning from cancelled/returned back to active: Deduct stock again
      else if (wasCanceled && !goingToCancel) {
        for (const item of foundOrder.orderitem) {
          const variant = await tx.query.productvariant.findFirst({
            where: and(
              eq(productvariant.productId, item.productId),
              eq(productvariant.label, item.variant)
            ),
          });
          if (!variant || variant.stock < item.quantity) {
            throw new Error(`Cannot restore order. Some items are out of stock.`);
          }
          await tx.update(productvariant)
            .set({ stock: sql`stock - ${item.quantity}` })
            .where(eq(productvariant.id, variant.id));
        }
      }

      await tx.update(order)
        .set({ status })
        .where(eq(order.id, id));

      return await tx.query.order.findFirst({
        where: eq(order.id, id),
      });
    });
  } catch (error) {
    throw error;
  }
};

const deleteOrder = async (id) => {
  try {
    return await db.transaction(async (tx) => {
      const foundOrder = await tx.query.order.findFirst({
        where: eq(order.id, id),
        with: { orderitem: true },
      });
      if (!foundOrder) throw new Error("Order not found");

      // Restore stock for non-cancelled/non-returned orders
      const cancels = ["cancelled", "returned"];
      if (!cancels.includes(foundOrder.status)) {
        for (const item of foundOrder.orderitem) {
          await tx.update(productvariant)
            .set({ stock: sql`stock + ${item.quantity}` })
            .where(and(
              eq(productvariant.productId, item.productId),
              eq(productvariant.label, item.variant)
            ));
        }
      }

      await tx.delete(order).where(eq(order.id, id));
      return { message: "Order deleted" };
    });
  } catch (error) {
    throw error;
  }
};

const updatePaymentStatus = async (id, paymentStatus) => {
  await db.update(order)
    .set({ paymentStatus })
    .where(eq(order.id, id));
  const updated = await db.query.order.findFirst({
    where: eq(order.id, id),
  });
  if (!updated) throw new Error("Order not found");
  return updated;
};

const updateOrderDetails = async (id, updates) => {
  const data = {};
  if (updates.shippingCharge !== undefined) data.shippingCharge = updates.shippingCharge;
  if (updates.totalAmount !== undefined) data.totalAmount = updates.totalAmount;
  if (updates.paymentMethod !== undefined) data.paymentMethod = updates.paymentMethod;
  if (updates.guestInfo) {
    data.guestName = updates.guestInfo.name;
    data.guestEmail = updates.guestInfo.email;
    data.guestPhone = updates.guestInfo.phone;
    data.guestAddress = updates.guestInfo.address;
    data.guestCity = updates.guestInfo.city;
    data.guestZipCode = updates.guestInfo.zipCode;
  }
  if (updates.paymentDetails) {
    data.senderNumber = updates.paymentDetails.senderNumber;
    data.txId = updates.paymentDetails.txId;
  }

  await db.update(order)
    .set(data)
    .where(eq(order.id, id));

  const updated = await db.query.order.findFirst({
    where: eq(order.id, id),
  });
  if (!updated) throw new Error("Order not found");
  return updated;
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderDetails,
  deleteOrder,
};