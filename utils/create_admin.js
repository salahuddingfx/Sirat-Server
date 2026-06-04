const { db, connectDB, pool } = require("../config/db.config");
const { user } = require("../db/schema");
const { eq } = require("drizzle-orm");
const bcrypt = require("bcryptjs");

async function resetAdminPassword() {
  try {
    await connectDB();
    console.log("Connected to database.");

    // Check if admin already exists
    const adminUser = await db.query.user.findFirst({
      where: eq(user.role, "admin"),
    });

    if (adminUser) {
      console.log(`Admin user found: ${adminUser.email}. Resetting password to admin123...`);
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.update(user)
        .set({ password: hashedPassword })
        .where(eq(user.id, adminUser.id));
      console.log("Password reset successfully!");
    } else {
      console.log("No admin user found.");
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Failed to reset admin password:", err);
    process.exit(1);
  }
}

resetAdminPassword();
