const { prisma } = require("../config/db.config");
const jwt = require("jsonwebtoken");
const env = require("../config/env.config");
const bcrypt = require("bcryptjs");

const registerUser = async (userData) => {
  const { email, username, phone, password, ...rest } = userData;
  
  const userExists = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        username ? { username } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (userExists) {
    throw new Error("User with this email, username, or phone already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      ...rest,
      email,
      username,
      phone,
      password: hashedPassword,
    },
  });

  const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  const userToReturn = { ...user };
  delete userToReturn.password;
  
  return { user: userToReturn, token };
};

const loginUser = async (identifier, password) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
        { phone: identifier }
      ]
    }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  const userToReturn = { ...user };
  delete userToReturn.password;

  return { user: userToReturn, token };
};

module.exports = { registerUser, loginUser };