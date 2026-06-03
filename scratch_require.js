const { connectDB } = require("./config/db.config");
connectDB().then(() => {
  console.log("Database connected successfully in script!");
  process.exit(0);
}).catch(err => {
  console.error("Database connection failed in script:", err);
  process.exit(1);
});
