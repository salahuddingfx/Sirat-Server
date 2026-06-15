const { connectDB } = require("../config/db.config");
const mongoose = require("mongoose");
const userService = require("../service/user.service");
const User = require("../models/user.model");

async function test() {
  try {
    await connectDB();
    mongoose.set("debug", true);
    console.log("Connected to DB, running profile update test...");
    
    // Let's find a user first
    const firstUser = await User.findOne();
    
    if (!firstUser) {
      console.log("No user found in DB to test with.");
      await mongoose.connection.close();
      process.exit(1);
    }
    const rawDoc = await User.collection.findOne({});
    console.log("Raw doc _id:", rawDoc._id);
    console.log("Raw doc _id constructor:", rawDoc._id.constructor ? rawDoc._id.constructor.name : "none");
    console.log("Type of raw doc _id:", typeof rawDoc._id);
    
    const castId = (id) => {
      if (typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)) {
        return new mongoose.Types.ObjectId(id);
      }
      return id;
    };

    const targetId = castId(firstUser._id);
    console.log("Testing update with only addresses for user targetId:", targetId);
    
    const uById = await User.findById(targetId);
    const uByOne = await User.findOne({ _id: targetId });
    console.log("uById is:", uById ? "Found" : "Not Found");
    console.log("uByOne is:", uByOne ? "Found" : "Not Found");

    const result = await userService.updateUserProfile(targetId, {
      addresses: [
        {
          street: "123 Test St",
          city: "Test City",
          zipCode: "12345",
          country: "Bangladesh",
          isDefault: true
        }
      ]
    });
    
    console.log("Update succeeded!", result);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

test();

