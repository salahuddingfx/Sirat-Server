const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL || "mysql://root:@localhost:3306/sirat";
const dbUrl = new URL(connectionString);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: dbUrl.port ? parseInt(dbUrl.port) : 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.substring(1),
});

const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("Connecting using parsed connection config...");
  await prisma.$connect();
  console.log("Connected successfully! Running query...");
  const user = await prisma.user.findFirst();
  console.log("Query completed successfully. Result:", user);
}

run().then(() => {
  console.log("Script completed successfully!");
  process.exit(0);
}).catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
