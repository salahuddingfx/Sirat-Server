const { db } = require("../config/db.config");
const { user } = require("../db/schema");
const { eq, or } = require("drizzle-orm");
const jwt = require("jsonwebtoken");
const env = require("../config/env.config");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const registerUser = async (userData) => {
  const { email, username, phone, password, ...rest } = userData;
  
  const conditions = [];
  conditions.push(eq(user.email, email));
  if (username) conditions.push(eq(user.username, username));
  if (phone) conditions.push(eq(user.phone, phone));

  const userExists = await db.query.user.findFirst({
    where: or(...conditions),
  });

  if (userExists) {
    throw new Error("User with this email, username, or phone already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();

  await db.insert(user).values({
    id: userId,
    ...rest,
    email,
    username,
    phone,
    password: hashedPassword,
  });

  const createdUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  const token = jwt.sign({ id: createdUser.id, role: createdUser.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  const userToReturn = { ...createdUser };
  delete userToReturn.password;
  
  return { user: userToReturn, token };
};

const loginUser = async (identifier, password) => {
  const foundUser = await db.query.user.findFirst({
    where: or(
      eq(user.email, identifier),
      eq(user.username, identifier),
      eq(user.phone, identifier)
    ),
  });

  if (!foundUser || !(await bcrypt.compare(password, foundUser.password))) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign({ id: foundUser.id, role: foundUser.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  const userToReturn = { ...foundUser };
  delete userToReturn.password;

  return { user: userToReturn, token };
};

module.exports = { registerUser, loginUser };