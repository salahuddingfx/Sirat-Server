const { connectDB } = require("../config/db.config");
const Product = require("../models/product.model");
const mongoose = require("mongoose");

async function run() {
  try {
    await connectDB();
    const dbProduct = await Product.findOne({});
    if (!dbProduct) {
      console.error("No product found in database to checkout.");
      await mongoose.connection.close();
      process.exit(1);
    }

    const targetVariant = dbProduct.variants && dbProduct.variants[0] ? dbProduct.variants[0].label : "M";
    const targetPrice = dbProduct.price;

    const payload = {
      guestInfo: {
        name: "Salahuddin",
        email: "salahuddin@example.com",
        phone: "01711223344",
        address: "Banani, Dhaka",
        city: "Dhaka"
      },
      items: [
        {
          product: dbProduct._id,
          quantity: 1,
          variant: targetVariant,
          price: targetPrice
        }
      ],
      shippingCharge: 120,
      totalAmount: targetPrice + 120,
      paymentMethod: "cod"
    };

    await mongoose.connection.close();

    console.log("Sending guest checkout POST request to http://localhost:5000/api/v1/orders for product:", dbProduct._id);
    const res = await fetch("http://localhost:5000/api/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
