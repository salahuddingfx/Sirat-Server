const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Counter = require("../models/counter.model");

/**
 * Helper to generate atomic sequential IDs
 */
const getNextSequenceValue = async (sequenceName) => {
  const result = await Counter.findOneAndUpdate(
    { id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

const createOrder = async (orderData) => {
  try {
    // 1. Validate variant stock for all items
    for (const item of orderData.items) {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Product not found.`);
      const variant = product.variants?.find(v => v.label === item.variant);
      if (!variant) throw new Error(`Variant "${item.variant}" not found for product "${product.name}".`);
      if ((variant.stock || 0) < item.quantity) {
        throw new Error(`"${product.name}" (Size: ${item.variant}) has insufficient stock. Available: ${variant.stock || 0}, Requested: ${item.quantity}`);
      }
    }

    // 2. Decrement variant stock atomically
    const deducted = [];
    try {
      for (const item of orderData.items) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, variants: { $elemMatch: { label: item.variant, stock: { $gte: item.quantity } } } },
          { $inc: { "variants.$.stock": -item.quantity } },
          { new: true }
        );
        if (!updatedProduct) {
          throw new Error(`Variant "${item.variant}" stock changed due to a concurrent order. Please try again.`);
        }
        deducted.push({ id: item.product, variant: item.variant, qty: item.quantity });
      }
    } catch (stockError) {
      // Rollback any deducted stock
      for (const d of deducted) {
        await Product.findOneAndUpdate(
          { _id: d.id, "variants.label": d.variant },
          { $inc: { "variants.$.stock": d.qty } }
        );
      }
      throw stockError;
    }

    // 3. Generate unique sequential order ID
    const seq = await getNextSequenceValue("orderId");
    const orderId = `SRT-${1000 + seq}`;

    const order = await Order.create({ ...orderData, orderId });
    return order;
  } catch (error) {
    throw error;
  }
};

const getOrders = async (query = {}) => {
  return await Order.find(query).populate("items.product").populate("user", "name email phone").sort({ createdAt: -1 });
};

const getOrderById = async (id) => {
  return await Order.findById(id).populate("items.product").populate("user", "name email phone");
};

const updateOrderStatus = async (id, status) => {
  try {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found");

    const oldStatus = order.status;
    const cancels = ["cancelled", "returned"];
    const goingToCancel = cancels.includes(status);
    const wasCanceled = cancels.includes(oldStatus);

    // Transitioning to cancelled/returned: Restore stock
    if (goingToCancel && !wasCanceled) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }
    // Transitioning from cancelled/returned back to active: Deduct stock again
    else if (wasCanceled && !goingToCancel) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (!product || product.stock < item.quantity) {
          throw new Error(`Cannot restore order. Product "${product?.name || 'Unknown'}" is out of stock.`);
        }

        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (!updatedProduct) {
          throw new Error(`Product stock changed due to a concurrent order. Please try again.`);
        }
      }
    }

    order.status = status;
    await order.save();

    return order;
  } catch (error) {
    throw error;
  }
};

const deleteOrder = async (id) => {
  try {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found");

    // Restore stock for non-cancelled/non-returned orders
    const cancels = ["cancelled", "returned"];
    if (!cancels.includes(order.status)) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }

    await Order.findByIdAndDelete(id);

    return { message: "Order deleted" };
  } catch (error) {
    throw error;
  }
};

const updatePaymentStatus = async (id, paymentStatus) => {
  const order = await Order.findByIdAndUpdate(id, { paymentStatus }, { new: true });
  if (!order) throw new Error("Order not found");
  return order;
};

const updateOrderDetails = async (id, updates) => {
  const allowed = ["guestInfo", "shippingCharge", "totalAmount", "paymentMethod", "paymentDetails", "items"];
  const sanitized = {};
  for (const key of Object.keys(updates)) {
    if (allowed.includes(key)) sanitized[key] = updates[key];
  }
  const order = await Order.findByIdAndUpdate(id, sanitized, { new: true, runValidators: true });
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
