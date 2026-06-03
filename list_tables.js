const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const connectionString = process.env.DATABASE_URL || "mysql://root:@localhost:3306/sirat";
  console.log("Connecting to:", connectionString);
  const connection = await mysql.createConnection(connectionString);
  const [rows] = await connection.query("SHOW TABLES;");
  console.log("Tables in database:", rows);
  
  try {
    const [joinTables] = await connection.query("SHOW TABLES LIKE '%flash%';");
    console.log("Flash sale related tables:", joinTables);
    for (const t of joinTables) {
      const tableName = Object.values(t)[0];
      const [desc] = await connection.query(`DESCRIBE \`${tableName}\`;`);
      console.log(`Columns of ${tableName}:`, desc);
    }
  } catch (err) {
    console.error("Error describing tables:", err.message);
  }

  await connection.end();
}

main().catch(console.error);
