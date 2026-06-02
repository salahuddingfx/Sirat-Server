const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Order = require("../models/order.model");

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB!");

    // Construct a payload similar to what the client sent when it failed
    // Wait, let's test a payload for a logged-in user (where guestInfo is missing)
    const payloadLoggedIn = {
      user: "6a1d37fdfadc75231e0c3bc6", // some valid-looking user ID
      items: [
        {
          product: "6a1d37fdfadc75231e0c3bc6", // Oat-Bar Oversized Tee
          quantity: 2,
          variant: "M",
          price: 1250,
        }
      ],
      shippingCharge: 120,
      totalAmount: 2620,
      paymentMethod: "cod",
      orderId: "SRT-9999", // sequential ID generated
    };

    console.log("Testing logged-in user order validation...");
    try {
      const order = new Order(payloadLoggedIn);
      await order.validate();
      console.log("Validation passed for logged-in user order!");
    } catch (err) {
      console.error("Validation failed for logged-in user order:", err.message);
    }

    // Construct a payload for a guest checkout (where guestInfo is provided)
    const payloadGuest = {
      guestInfo: {
        name: "Test Guest",
        email: "test@example.com",
        phone: "01711223344",
        address: "Test Address",
        city: "Dhaka",
      },
      items: [
        {
          product: "6a1d37fdfadc75231e0c3bc6",
          quantity: 2,
          variant: "M",
          price: 1250,
        }
      ],
      shippingCharge: 120,
      totalAmount: 2620,
      paymentMethod: "cod",
      orderId: "SRT-9998",
    };

    console.log("\nTesting guest order validation...");
    try {
      const order = new Order(payloadGuest);
      await order.validate();
      console.log("Validation passed for guest order!");
    } catch (err) {
      console.error("Validation failed for guest order:", err.message);
    }

  } catch (err) {
    console.error("Error connecting or running:", err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
