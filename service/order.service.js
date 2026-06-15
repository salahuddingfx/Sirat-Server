const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const Counter = require("../models/counter.model");
const couponService = require("./coupon.service");
const crypto = require("crypto");

/**
 * Format Product helper mapping images for frontend compatibility
 */
const formatProduct = (p) => {
  if (!p) return null;
  const obj = p.toObject ? p.toObject() : p;
  obj.id = obj._id;
  if (obj.categoryId && typeof obj.categoryId === "object") {
    obj.category = {
      ...obj.categoryId,
      id: obj.categoryId._id,
    };
    obj.categoryId = obj.categoryId._id;
  }
  if (obj.variants) {
    obj.variants = obj.variants.map((v) => ({ ...v, id: v._id }));
  }
  if (obj.images) {
    obj.images = obj.images.map((img) => typeof img === "string" ? { url: img } : img);
  }
  return obj;
};

/**
 * Helper to generate sequential order IDs atomically
 */
const getNextSequenceValue = async (sequenceName, session) => {
  const counter = await Counter.findOneAndUpdate(
    { name: sequenceName },
    { $inc: { count: 1 } },
    { new: true, upsert: true, session }
  );
  return counter.count;
};

/**
 * Helper to map flat database columns into the nested shape the frontend expects
 */
const populateOrders = async (orders) => {
  const populated = [];
  for (const o of orders) {
    const orderObj = o.toObject ? o.toObject() : o;
    orderObj.id = orderObj._id;
    
    // Map nested guestInfo from flat schema columns
    orderObj.guestInfo = {
      name: orderObj.guestName || "",
      email: orderObj.guestEmail || "",
      phone: orderObj.guestPhone || "",
      address: orderObj.guestAddress || "",
      city: orderObj.guestCity || "",
      zipCode: orderObj.guestZipCode || "",
    };

    // Map nested paymentDetails from flat schema columns
    orderObj.paymentDetails = {
      senderNumber: orderObj.senderNumber || "",
      txId: orderObj.txId || "",
    };

    // Populate order items products
    const populatedItems = [];
    if (orderObj.items) {
      for (const item of orderObj.items) {
        const itemObj = { ...item };
        itemObj.id = itemObj._id;
        
        const prod = await Product.findById(item.productId).populate("categoryId");
        if (prod) {
          itemObj.product = formatProduct(prod);
        } else {
          itemObj.product = null;
        }
        populatedItems.push(itemObj);
      }
    }
    orderObj.items = populatedItems;
    
    // Populate User Details
    if (orderObj.userId) {
      const usr = await User.findById(orderObj.userId).select("id name email phone");
      if (usr) {
        orderObj.user = usr.toObject();
        orderObj.user.id = orderObj.user._id;
      } else {
        orderObj.user = null;
      }
    } else {
      orderObj.user = null;
    }

    populated.push(orderObj);
  }
  return populated;
};

const getCategoryCode = (catName) => {
  if (!catName) return "GEN";
  const clean = catName.replace(/[^a-zA-Z\s]/g, "").trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : words[1][1] || "X")).toUpperCase();
  }
  return clean.substring(0, 3).toUpperCase();
};

const getProductCode = (prodName) => {
  if (!prodName) return "PRD";
  const clean = prodName.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    return (words[0][0] + words[1][0] + (words[1][1] || "X")).toUpperCase();
  } else if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  return "PRD";
};

const createOrder = async (orderData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Validate & Decrement stock for all items
    let firstProductInfo = null;
    for (const item of orderData.items) {
      const prod = await Product.findById(item.product).populate("categoryId").session(session);
      if (!prod) {
        throw new Error(`Product not found.`);
      }

      if (!firstProductInfo) {
        firstProductInfo = {
          name: prod.name,
          categoryName: prod.categoryId ? prod.categoryId.name : null,
        };
      }

      // Find variant in nested subdocument array
      const variant = prod.variants.find((v) => v.label === item.variant);
      if (!variant) {
        throw new Error(`Variant "${item.variant}" not found.`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(
          `"${prod.name}" (Size: ${item.variant}) has insufficient stock. Available: ${variant.stock}, Requested: ${item.quantity}`
        );
      }

      // Decrement stock in variant subdocument and save
      variant.stock -= item.quantity;
      await prod.save({ session });
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

    // 4. Verify totalAmount is not lower than expected
    const expectedMinTotal = computedSubtotal - finalDiscountAmount + (orderData.shippingCharge || 0);
    if (orderData.totalAmount < expectedMinTotal - 1) {
      throw new Error("Total amount mismatch. Please refresh and try again.");
    }

    // 5. Generate unique sequential order ID
    const seq = await getNextSequenceValue("orderId", session);
    const catCode = getCategoryCode(firstProductInfo?.categoryName);
    const prodCode = getProductCode(firstProductInfo?.name);
    const orderIdString = `SRT-${catCode}-${prodCode}-${String(seq).padStart(6, "0")}`;

    // 6. Create Order
    const mappedItems = orderData.items.map((item) => ({
      productId: item.product,
      quantity: item.quantity,
      variant: item.variant,
      price: item.price,
    }));

    const [newOrder] = await Order.create([{
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
      items: mappedItems,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const [populated] = await populateOrders([newOrder]);
    return populated;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getOrders = async (query = {}) => {
  const filter = {};
  if (query.user) filter.userId = query.user;
  if (query.status) filter.status = query.status;

  const orders = await Order.find(filter).sort({ createdAt: -1 });
  return await populateOrders(orders);
};

const getOrderById = async (id) => {
  const foundOrder = await Order.findById(id);
  if (!foundOrder) return null;

  const [populated] = await populateOrders([foundOrder]);
  return populated;
};

const updateOrderStatus = async (id, status) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const foundOrder = await Order.findById(id).session(session);
    if (!foundOrder) throw new Error("Order not found");

    const oldStatus = foundOrder.status;
    const cancels = ["cancelled", "returned"];
    const goingToCancel = cancels.includes(status);
    const wasCanceled = cancels.includes(oldStatus);

    // Transitioning to cancelled/returned: Restore stock
    if (goingToCancel && !wasCanceled) {
      for (const item of foundOrder.items) {
        const prod = await Product.findById(item.productId).session(session);
        if (prod) {
          const variant = prod.variants.find((v) => v.label === item.variant);
          if (variant) {
            variant.stock += item.quantity;
            await prod.save({ session });
          }
        }
      }
    }
    // Transitioning from cancelled/returned back to active: Deduct stock again
    else if (wasCanceled && !goingToCancel) {
      for (const item of foundOrder.items) {
        const prod = await Product.findById(item.productId).session(session);
        if (!prod) {
          throw new Error("Product no longer exists. Cannot restore order.");
        }
        const variant = prod.variants.find((v) => v.label === item.variant);
        if (!variant || variant.stock < item.quantity) {
          throw new Error(`Cannot restore order. Some items are out of stock.`);
        }
        variant.stock -= item.quantity;
        await prod.save({ session });
      }
    }

    foundOrder.status = status;
    await foundOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    const [populated] = await populateOrders([foundOrder]);
    return populated;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const deleteOrder = async (id) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const foundOrder = await Order.findById(id).session(session);
    if (!foundOrder) throw new Error("Order not found");

    // Restore stock for active orders when they are deleted
    const cancels = ["cancelled", "returned"];
    if (!cancels.includes(foundOrder.status)) {
      for (const item of foundOrder.items) {
        const prod = await Product.findById(item.productId).session(session);
        if (prod) {
          const variant = prod.variants.find((v) => v.label === item.variant);
          if (variant) {
            variant.stock += item.quantity;
            await prod.save({ session });
          }
        }
      }
    }

    await Order.findByIdAndDelete(id).session(session);
    await session.commitTransaction();
    session.endSession();

    return { message: "Order deleted" };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const updatePaymentStatus = async (id, paymentStatus) => {
  const updated = await Order.findByIdAndUpdate(
    id,
    { $set: { paymentStatus } },
    { new: true }
  );
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

  const updated = await Order.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true }
  );

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