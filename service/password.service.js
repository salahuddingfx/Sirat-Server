const User = require("../models/user.model");
const PasswordResetToken = require("../models/passwordResetToken.model");
const bcrypt = require("bcryptjs");
const { sendPasswordResetEmail } = require("./mail.service");

const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const requestReset = async (email) => {
  const foundUser = await User.findOne({ email });
  if (!foundUser) {
    return { message: "If that email is registered, a reset code has been sent." };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await PasswordResetToken.create({
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
  const token = await PasswordResetToken.findOne({
    email,
    otp,
    used: false,
  });

  if (!token) throw new Error("Invalid or expired reset code.");
  if (new Date() > new Date(token.expiresAt)) throw new Error("Reset code has expired.");

  return { message: "OTP verified." };
};

const resetPassword = async (email, otp, newPassword) => {
  const token = await PasswordResetToken.findOne({
    email,
    otp,
    used: false,
  });

  if (!token) throw new Error("Invalid or expired reset code.");
  if (new Date() > new Date(token.expiresAt)) throw new Error("Reset code has expired.");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate({ email }, { $set: { password: hashedPassword } });
  
  token.used = true;
  await token.save();

  return { message: "Password has been reset successfully." };
};

module.exports = { requestReset, verifyOtp, resetPassword };
