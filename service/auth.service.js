const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const env = require("../config/env.config");
const bcrypt = require("bcryptjs");

const registerUser = async (userData) => {
  const { email, username, phone, password, ...rest } = userData;

  const conditions = [{ email }];
  if (username) conditions.push({ username });
  if (phone) conditions.push({ phone });

  const userExists = await User.findOne({ $or: conditions });
  if (userExists) {
    throw new Error("User with this email, username, or phone already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const createdUser = await User.create({
    ...rest,
    email,
    username: username || undefined,
    phone: phone || undefined,
    password: hashedPassword,
  });

  const token = jwt.sign({ id: createdUser._id, role: createdUser.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  const userToReturn = createdUser.toObject();
  delete userToReturn.password;
  userToReturn.id = userToReturn._id; // client/admin compatibility

  return { user: userToReturn, token };
};

const loginUser = async (identifier, password) => {
  const foundUser = await User.findOne({
    $or: [
      { email: identifier },
      { username: identifier },
      { phone: identifier }
    ],
  });

  if (!foundUser || !(await bcrypt.compare(password, foundUser.password))) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign({ id: foundUser._id, role: foundUser.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  const userToReturn = foundUser.toObject();
  delete userToReturn.password;
  userToReturn.id = userToReturn._id; // client/admin compatibility

  return { user: userToReturn, token };
};

module.exports = { registerUser, loginUser };