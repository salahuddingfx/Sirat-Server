const { db } = require("../config/db.config");
const { user, passwordresettoken } = require("../db/schema");
const { eq, and } = require("drizzle-orm");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { sendPasswordResetEmail } = require("./mail.service");

const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const requestReset = async (email) => {
  const [foundUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!foundUser) {
    return { message: "If that email is registered, a reset code has been sent." };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.insert(passwordresettoken).values({
    id: crypto.randomUUID(),
    email,
    otp,
    expiresAt,
  });

  try {
    await sendPasswordResetEmail(email, otp);
  } catch (mailErr) {
    console.error("Failed to send password reset email:", mailErr?.message || mailErr);
  }

  return { message: "If that email is registered, a reset code has been sent." };
};

const verifyOtp = async (email, otp) => {
  const [token] = await db.select()
    .from(passwordresettoken)
    .where(and(
      eq(passwordresettoken.email, email),
      eq(passwordresettoken.otp, otp),
      eq(passwordresettoken.used, false)
    ))
    .limit(1);

  if (!token) throw new Error("Invalid or expired reset code.");
  if (new Date() > new Date(token.expiresAt)) throw new Error("Reset code has expired.");

  return { message: "OTP verified." };
};

const resetPassword = async (email, otp, newPassword) => {
  const [token] = await db.select()
    .from(passwordresettoken)
    .where(and(
      eq(passwordresettoken.email, email),
      eq(passwordresettoken.otp, otp),
      eq(passwordresettoken.used, false)
    ))
    .limit(1);

  if (!token) throw new Error("Invalid or expired reset code.");
  if (new Date() > new Date(token.expiresAt)) throw new Error("Reset code has expired.");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.update(user).set({ password: hashedPassword }).where(eq(user.email, email));
  await db.update(passwordresettoken).set({ used: true }).where(eq(passwordresettoken.id, token.id));

  return { message: "Password has been reset successfully." };
};

module.exports = { requestReset, verifyOtp, resetPassword };
