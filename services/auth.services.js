const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const registerUser = async (userData) => {
  const { email } = userData;
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new Error("User already exists");
  }
  const user = await User.create(userData);
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
  return { user, token };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new Error("Invalid email or password");
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
  return { user, token };
};

module.exports = { registerUser, loginUser };
