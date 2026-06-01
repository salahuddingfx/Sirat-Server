const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Counter = require("../models/counter.model");

/**
 * Helper to generate atomic sequential IDs
 */
const getNextSequenceValue = async (sequenceName, session = null) => {
  const result = await Counter.findOneAndUpdate(
    { id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return result.seq;
};

const createOrder = async (orderData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate stock for all items first
    for (const item of orderData.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product not found.`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Product "${product.name}" has insufficient stock. Available: ${product.stock}, Requested: ${item.quantity}`);
      }
    }

    // 2. Decrement stock atomically
    for (const item of orderData.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, session }
      );
      if (!updatedProduct) {
        throw new Error(`Product stock changed due to a concurrent order. Please try again.`);
      }
    }

    // 3. Generate unique sequential order ID
    const seq = await getNextSequenceValue("orderId", session);
    const orderId = `SRT-${1000 + seq}`;

    const order = await Order.create([{ ...orderData, orderId }], { session });
    const finalOrder = order[0];

    await session.commitTransaction();
    return finalOrder;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getOrders = async (query = {}) => {
  return await Order.find(query).populate("items.product").sort({ createdAt: -1 });
};

const getOrderById = async (id) => {
  return await Order.findById(id).populate("items.product");
};

const updateOrderStatus = async (id, status) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(id).session(session);
    if (!order) throw new Error("Order not found");

    const oldStatus = order.status;

    // Transitioning to cancelled: Restore stock
    if (status === "cancelled" && oldStatus !== "cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { session }
        );
      }
    }
    // Transitioning from cancelled back to active: Deduct stock again
    else if (oldStatus === "cancelled" && status !== "cancelled") {
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product || product.stock < item.quantity) {
          throw new Error(`Cannot restore order. Product "${product?.name || 'Unknown'}" is out of stock.`);
        }

        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session }
        );
        if (!updatedProduct) {
          throw new Error(`Product stock changed due to a concurrent order. Please try again.`);
        }
      }
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
