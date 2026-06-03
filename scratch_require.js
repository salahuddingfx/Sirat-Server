const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function run() {
  console.log("Connecting directly using native Prisma client...");
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
