const { drizzle } = require("drizzle-orm/mysql2");
const mysql = require("mysql2/promise");
const schema = require("../db/schema");

const connectionString = process.env.DATABASE_URL || "mysql://root:@localhost:3306/sirat";

const pool = mysql.createPool(connectionString);
const db = drizzle(pool, { schema, mode: "default" });

const connectDB = async () => {
  try {
    // Verify connection by getting a connection from the pool
    const connection = await pool.getConnection();
    connection.release();
    console.log("  \x1b[1;33m» DATABASE:\x1b[0m   \x1b[1;32mConnected & Pool Initialized (Drizzle + MySQL)\x1b[0m");
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, db, prisma: db, pool };
