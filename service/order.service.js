const { prisma } = require("../config/db.config");

/**
 * Helper to generate atomic sequential IDs
 */
const getNextSequenceValue = async (sequenceName) => {
  const result = await prisma.counter.upsert({
    where: { name: sequenceName },
    update: { count: { increment: 1 } },
    create: { name: sequenceName, count: 1 },
  });
  return result.count;
};

const createOrder = async (orderData) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate & Decrement stock for all items
      for (const item of orderData.items) {
        const variant = await tx.productVariant.findFirst({
          where: { productId: item.product, label: item.variant },
          include: { product: true },
        });

        if (!variant) throw new Error(`Variant "${item.variant}" not found.`);
        if (variant.stock < item.quantity) {
          throw new Error(
            `"${variant.product.name}" (Size: ${item.variant}) has insufficient stock. Available: ${variant.stock}, Requested: ${item.quantity}`
          );
        }

        // Decrement stock
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 2. Generate unique sequential order ID
      const seq = await getNextSequenceValue("orderId");
      const orderId = `SRT-${1000 + seq}`;

      // 3. Create Order
      const order = await tx.order.create({
        data: {
          orderId,
          user: orderData.user ? { connect: { id: orderData.user } } : undefined,
          guestName: orderData.guestInfo?.name,
          guestEmail: orderData.guestInfo?.email,
          guestPhone: orderData.guestInfo?.phone,
          guestAddress: orderData.guestInfo?.address,
          guestCity: orderData.guestInfo?.city,
          guestZipCode: orderData.guestInfo?.zipCode,
          shippingCharge: orderData.shippingCharge,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod,
          senderNumber: orderData.paymentDetails?.senderNumber,
          txId: orderData.paymentDetails?.txId,
          items: {
            create: orderData.items.map((item) => ({
              productId: item.product,
              quantity: item.quantity,
              variant: item.variant,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          user: {
            select: { name: true, email: true, phone: true },
          },
        },
      });

      return order;
    });
  } catch (error) {
    throw error;
  }
};

const getOrders = async (query = {}) => {
  let where = {};
  if (query.user) where.userId = query.user;
  if (query.status) where.status = query.status;

  return await prisma.order.findMany({
    where,
    include: {
      items: {
        include: { product: true },
      },
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const getOrderById = async (id) => {
  return await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: true },
      },
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });
};

const updateOrderStatus = async (id, status) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new Error("Order not found");

      const oldStatus = order.status;
      const cancels = ["cancelled", "returned"];
      const goingToCancel = cancels.includes(status);
      const wasCanceled = cancels.includes(oldStatus);

      // Transitioning to cancelled/returned: Restore stock
      if (goingToCancel && !wasCanceled) {
        for (const item of order.items) {
          await tx.productVariant.updateMany({
            where: { productId: item.productId, label: item.variant },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      // Transitioning from cancelled/returned back to active: Deduct stock again
      else if (wasCanceled && !goingToCancel) {
        for (const item of order.items) {
          const variant = await tx.productVariant.findFirst({
            where: { productId: item.productId, label: item.variant },
          });
          if (!variant || variant.stock < item.quantity) {
            throw new Error(`Cannot restore order. Some items are out of stock.`);
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return await tx.order.update({
        where: { id },
        data: { status },
      });
    });
  } catch (error) {
    throw error;
  }
};

const deleteOrder = async (id) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new Error("Order not found");

      // Restore stock for non-cancelled/non-returned orders
      const cancels = ["cancelled", "returned"];
      if (!cancels.includes(order.status)) {
        for (const item of order.items) {
          await tx.productVariant.updateMany({
            where: { productId: item.productId, label: item.variant },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.order.delete({ where: { id } });
      return { message: "Order deleted" };
    });
  } catch (error) {
    throw error;
  }
};

const updatePaymentStatus = async (id, paymentStatus) => {
  const order = await prisma.order.update({
    where: { id },
    data: { paymentStatus },
  });
  if (!order) throw new Error("Order not found");
  return order;
};

const updateOrderDetails = async (id, updates) => {
  // Mapping allowed fields
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

  const order = await prisma.order.update({
    where: { id },
    data,
  });
  if (!order) throw new Error("Order not found");
  return order;
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