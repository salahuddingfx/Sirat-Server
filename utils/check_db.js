const { db, connectDB, pool } = require("../config/db.config");
const { product, user, category } = require("../db/schema");
const { count } = require("drizzle-orm");

async function check() {
  try {
    console.log("Checking database connection...");
    await connectDB();
    console.log("Successfully connected to MySQL via Drizzle!");

    const [pResult] = await db.select({ value: count() }).from(product);
    const [uResult] = await db.select({ value: count() }).from(user);
    const [cResult] = await db.select({ value: count() }).from(category);

    console.log("\x1b[32mStats:\x1b[0m");
    console.log(`- Products: ${pResult.value}`);
    console.log(`- Users: ${uResult.value}`);
    console.log(`- Categories: ${cResult.value}`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("\x1b[31mDatabase check failed:\x1b[0m", err.message);
    process.exit(1);
  }
}

check();
