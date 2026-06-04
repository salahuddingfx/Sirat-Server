const { connectDB, pool } = require("../config/db.config");
const userService = require("../service/user.service");

async function test() {
  try {
    await connectDB();
    console.log("Connected to DB, running profile update test...");
    
    // Let's find a user first
    const { db } = require("../config/db.config");
    const { user } = require("../db/schema");
    const [firstUser] = await db.select().from(user).limit(1);
    
    if (!firstUser) {
      console.log("No user found in DB to test with.");
      process.exit(1);
    }
    
    console.log("Testing update with only addresses for user:", firstUser.id);
    const result = await userService.updateUserProfile(firstUser.id, {
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
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    await pool.end();
    process.exit(1);
  }
}

test();
