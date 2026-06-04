const { db } = require("../config/db.config");
const { order, orderitem, productvariant, counter, user, product, productimage } = require("../db/schema");
const { eq, and, desc, sql, inArray } = require("drizzle-orm");
const crypto = require("crypto");
const couponService = require("./coupon.service");

/**
 * Helper to generate atomic sequential IDs
 */
const getNextSequenceValue = async (tx, sequenceName) => {
  await tx.insert(counter)
    .values({ id: crypto.randomUUID(), name: sequenceName, count: 1 })
    .onDuplicateKeyUpdate({
      set: { count: sql`count + 1` }
    });

  const [result] = await tx.select()
    .from(counter)
    .where(eq(counter.name, sequenceName))
    .limit(1);

  return result.count;
};

/**
 * Helper to populate orderitems, their products (with images), and users for a list of orders.
 * Transforms flat DB columns into the nested shape the frontend expects:
 *   _id, guestInfo { name, email, phone, address, city, zipCode },
 *   paymentDetails { senderNumber, txId }, items[] with product.images[]
 */
const populateOrders = async (orders, executor = db) => {
  if (orders.length === 0) return [];
  const orderIds = orders.map((o) => o.id);

  // Fetch all orderitems for these orders
  const items = await executor.select()
    .from(orderitem)
    .where(inArray(orderitem.orderId, orderIds));

  // Fetch products for all these items
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const products = productIds.length > 0
    ? await executor.select().from(product).where(inArray(product.id, productIds))
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Fetch product images for all products referenced in items
  const productImages = productIds.length > 0
    ? await executor.select().from(productimage).where(inArray(productimage.productId, productIds))
    : [];
  const productImagesMap = new Map();
  productImages.forEach((img) => {
    if (!productImagesMap.has(img.productId)) productImagesMap.set(img.productId, []);
    productImagesMap.get(img.productId).push(img);
  });

  // Attach product (with images) to each item
  const populatedItems = items.map((item) => {
    const prod = productMap.get(item.productId) || null;
    return {
      ...item,
      product: prod ? {
        ...prod,
        images: productImagesMap.get(prod.id) || [],
      } : null,
    };
  });

  // Fetch users for these orders
  const userIds = [...new Set(orders.map((o) => o.userId).filter(Boolean))];
  const users = userIds.length > 0
    ? await executor.select({ id: user.id, name: user.name, email: user.email, phone: user.phone }).from(user).where(inArray(user.id, userIds))
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Group items by orderId
  const itemsMap = new Map();
  populatedItems.forEach((item) => {
    if (!itemsMap.has(item.orderId)) itemsMap.set(item.orderId, []);
    itemsMap.get(item.orderId).push(item);
  });

  // Transform flat DB columns into the nested shape the frontend expects
  return orders.map((o) => ({
    _id: o.id,
    id: o.id,
    orderId: o.orderId,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    shippingCharge: o.shippingCharge,
    totalAmount: o.totalAmount,
    discountAmount: o.discountAmount || 0,
    couponCode: o.couponCode || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    // Nested guestInfo from flat columns
    guestInfo: {
      name: o.guestName || "",
      email: o.guestEmail || "",
      phone: o.guestPhone || "",
      address: o.guestAddress || "",
      city: o.guestCity || "",
      zipCode: o.guestZipCode || "",
    },
    // Nested paymentDetails from flat columns
    paymentDetails: {
      senderNumber: o.senderNumber || "",
      txId: o.txId || "",
    },
    // Rename orderitem → items
    items: itemsMap.get(o.id) || [],
    user: o.userId ? userMap.get(o.userId) || null : null,
  }));
};

const createOrder = async (orderData) => {
  try {
    return await db.transaction(async (tx) => {
      // 1. Validate & Decrement stock for all items
      for (const item of orderData.items) {
        // Query variant and join with product to get details
        const rows = await tx.select({
          id: productvariant.id,
          label: productvariant.label,
          priceDelta: productvariant.priceDelta,
          stock: productvariant.stock,
          productId: productvariant.productId,
          product: {
            name: product.name,
          },
        })
        .from(productvariant)
        .innerJoin(product, eq(productvariant.productId, product.id))
        .where(and(
          eq(productvariant.productId, item.product),
          eq(productvariant.label, item.variant)
        ))
        .limit(1);

        const variant = rows[0] || null;

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

      // 2. Compute subtotal from items
      const computedSubtotal = orderData.items.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0
      );

      // 3. Validate coupon if provided
      let finalDiscountAmount = 0;
      let validatedCouponCode = null;
      if (orderData.couponCode) {
        try {
          const couponResult = await couponService.validateCoupon(
            orderData.couponCode,
            computedSubtotal
          );
          finalDiscountAmount = couponResult.discountAmount;
          validatedCouponCode = couponResult.code;
        } catch (err) {
          throw new Error(`Coupon validation failed: ${err.message}`);
        }
      }

      // 4. Verify totalAmount is not lower than expected (no undercharging)
      const expectedMinTotal = computedSubtotal - finalDiscountAmount + (orderData.shippingCharge || 0);
      if (orderData.totalAmount < expectedMinTotal - 1) {
        throw new Error("Total amount mismatch. Please refresh and try again.");
      }

      // 5. Generate unique sequential order ID
      const seq = await getNextSequenceValue(tx, "orderId");
      const orderIdString = `SRT-${1000 + seq}`;

      // 6. Create Order
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
        discountAmount: finalDiscountAmount,
        couponCode: validatedCouponCode,
        paymentMethod: orderData.paymentMethod,
        senderNumber: orderData.paymentDetails?.senderNumber || null,
        txId: orderData.paymentDetails?.txId || null,
      });

      // 7. Create Order Items
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

      // 8. Fetch and return created order with relation mappings
      const [newOrder] = await tx.select().from(order).where(eq(order.id, orderUuid)).limit(1);
      if (!newOrder) return null;

      const [populated] = await populateOrders([newOrder], tx);
      return populated;
    });
  } catch (error) {
    throw error;
  }
};

const getOrders = async (query = {}) => {
  const conditions = [];
  if (query.user) conditions.push(eq(order.userId, query.user));
  if (query.status) conditions.push(eq(order.status, query.status));

  const orders = await db.select()
    .from(order)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(order.createdAt));

  return await populateOrders(orders);
};

const getOrderById = async (id) => {
  const [foundOrder] = await db.select().from(order).where(eq(order.id, id)).limit(1);
  if (!foundOrder) return null;

  const [populated] = await populateOrders([foundOrder]);
  return populated;
};

const updateOrderStatus = async (id, status) => {
  try {
    return await db.transaction(async (tx) => {
      const [foundOrder] = await tx.select().from(order).where(eq(order.id, id)).limit(1);
      if (!foundOrder) throw new Error("Order not found");

      const orderItems = await tx.select().from(orderitem).where(eq(orderitem.orderId, id));
      foundOrder.orderitem = orderItems;

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
          const [variant] = await tx.select()
            .from(productvariant)
            .where(and(
              eq(productvariant.productId, item.productId),
              eq(productvariant.label, item.variant)
            ))
            .limit(1);

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

      const [updated] = await tx.select().from(order).where(eq(order.id, id)).limit(1);
      if (!updated) return null;
      const [populated] = await populateOrders([updated], tx);
      return populated;
    });
  } catch (error) {
    throw error;
  }
};

const deleteOrder = async (id) => {
  try {
    return await db.transaction(async (tx) => {
      const [foundOrder] = await tx.select().from(order).where(eq(order.id, id)).limit(1);
      if (!foundOrder) throw new Error("Order not found");

      const orderItems = await tx.select().from(orderitem).where(eq(orderitem.orderId, id));
      foundOrder.orderitem = orderItems;

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
  const [updated] = await db.select().from(order).where(eq(order.id, id)).limit(1);
  if (!updated) throw new Error("Order not found");
  const [populated] = await populateOrders([updated]);
  return populated;
};

const updateOrderDetails = async (id, updates) => {
  const data = {};
  if (updates.shippingCharge !== undefined) data.shippingCharge = updates.shippingCharge;
  if (updates.totalAmount !== undefined) data.totalAmount = updates.totalAmount;
  if (updates.discountAmount !== undefined) data.discountAmount = updates.discountAmount;
  if (updates.couponCode !== undefined) data.couponCode = updates.couponCode;
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

  const [updated] = await db.select().from(order).where(eq(order.id, id)).limit(1);
  if (!updated) throw new Error("Order not found");
  const [populated] = await populateOrders([updated]);
  return populated;
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