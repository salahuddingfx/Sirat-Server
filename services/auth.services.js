const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

const registerUser = async (userData) => {
  const { email, username, phone } = userData;
  
  const userExists = await User.findOne({ 
    $or: [
        { email },
        { username: username || 'null_placeholder' },
        { phone: phone || 'null_placeholder' }
    ].filter(query => Object.values(query)[0] !== 'null_placeholder')
  });

  if (userExists) {
    throw new Error("User with this email, username, or phone already exists.");
  }

  const user = await User.create(userData);
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
  return { user, token };
};

const loginUser = async (identifier, password) => {
  const user = await User.findOne({
    $or: [
        { email: identifier },
        { username: identifier },
        { phone: identifier }
    ]
  });

  if (!user || !(await user.comparePassword(password))) {
    throw new Error("Invalid credentials");
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
  return { user, token };
};

module.exports = { registerUser, loginUser };
