const Order = require("../models/order.model");
const Product = require("../models/product.model");

const createOrder = async (orderData) => {
  const decrementedItems = [];
  try {
    // 1. Validate stock for all items first
    for (const item of orderData.items) {
      const product = await Product.findById(item.product);
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
        { new: true }
      );
      if (!updatedProduct) {
        const product = await Product.findById(item.product);
        throw new Error(`Product "${product?.name || 'Unknown'}" stock changed due to a concurrent order. Please try again.`);
      }
      decrementedItems.push({ product: item.product, quantity: item.quantity });
    }

    // Generate unique order ID
    const orderCount = await Order.countDocuments();
    const orderId = `SRT-${1000 + orderCount + 1}`;
    
    const order = await Order.create({ ...orderData, orderId });
    return order;
  } catch (error) {
    // Rollback already decremented stock on failure
    for (const decremented of decrementedItems) {
      await Product.findByIdAndUpdate(decremented.product, {
        $inc: { stock: decremented.quantity }
      });
    }
    throw error;
  }
};

const getOrders = async (query = {}) => {
  return await Order.find(query).populate("items.product").sort({ createdAt: -1 });
};

const getOrderById = async (id) => {
  return await Order.findById(id).populate("items.product");
};

const updateOrderStatus = async (id, status) => {
  const order = await Order.findById(id);
  if (!order) throw new Error("Order not found");

  const oldStatus = order.status;

  // Transitioning to cancelled: Restore stock
  if (status === "cancelled" && oldStatus !== "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }
  }
  // Transitioning from cancelled back to active: Deduct stock again
  else if (oldStatus === "cancelled" && status !== "cancelled") {
    // Validate stock availability first
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Cannot restore order. Product "${product?.name || 'Unknown'}" is out of stock.`);
      }
    }
    // Deduct stock
    for (const item of order.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }
  }

  order.status = status;
  await order.save();
  return order;
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};