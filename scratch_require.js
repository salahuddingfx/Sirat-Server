try {
  console.log("Loading db.config...");
  require("./config/db.config");
  console.log("db.config loaded successfully!");
} catch (err) {
  console.error("Error loading db.config:", err);
}
