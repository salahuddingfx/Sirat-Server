const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

const getUserById = async (id) => {
  const foundUser = await User.findById(id);
  if (!foundUser) return null;

  const userToReturn = foundUser.toObject();
  delete userToReturn.password;
  userToReturn.id = userToReturn._id; // client/admin compatibility
  return userToReturn;
};

const updateUserProfile = async (id, updateData) => {
  const { name, phone, username, avatar, addresses } = updateData;

  const updatePayload = {};
  if (name !== undefined) updatePayload.name = name;
  if (phone !== undefined) updatePayload.phone = phone === "" ? null : phone;
  if (username !== undefined) updatePayload.username = username === "" ? null : username;
  if (avatar !== undefined) updatePayload.avatar = avatar;
  if (addresses !== undefined) updatePayload.addresses = addresses;

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true }
  );

  if (!updatedUser) return null;

  const userToReturn = updatedUser.toObject();
  delete userToReturn.password;
  userToReturn.id = userToReturn._id; // client/admin compatibility
  return userToReturn;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const foundUser = await User.findById(userId);
  if (!foundUser) throw new Error("User not found");

  const isMatch = await bcrypt.compare(currentPassword, foundUser.password);
  if (!isMatch) throw new Error("Current password is incorrect");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  foundUser.password = hashedPassword;
  await foundUser.save();

  return { message: "Password updated successfully" };
};

module.exports = { getUserById, updateUserProfile, changePassword };