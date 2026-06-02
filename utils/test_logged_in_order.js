const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    const JWT_SECRET = process.env.JWT_SECRET;
    
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB!");

    // Find any user in the database or create one to generate a valid token
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    let user = await User.findOne({});
    if (!user) {
      console.log("No user found. Creating a test user...");
      user = await User.create({
        name: "Test User",
        email: "testuser@example.com",
        password: "password123",
        role: "user"
      });
    }

    console.log("User:", user.email, "ID:", user._id);
    
    // Generate valid token
    const token = jwt.sign({ id: user._id.toString(), role: user.role || "user" }, JWT_SECRET, { expiresIn: "1d" });
    console.log("Generated Token:", token);

    // Payload for order (logged in, guestInfo undefined)
    const payload = {
      guestInfo: undefined,
      items: [
        {
          product: "6a1d37fdfadc75231e0c3bc6", // Oat-Bar Oversized Tee
          quantity: 1,
          variant: "M",
          price: 1250
        }
      ],
      shippingCharge: 120,
      totalAmount: 1370,
      paymentMethod: "cod"
    };

    console.log("Sending POST request to http://localhost:5000/api/orders with token...");
    const res = await fetch("http://localhost:5000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
