const jwt = require("jsonwebtoken");
const { db } = require("../config/db.config");
const { user: userTable } = require("../db/schema");
const { eq } = require("drizzle-orm");
const env = require("../config/env.config");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, env.jwtSecret);
      
      const user = await db.query.user.findFirst({
        where: eq(userTable.id, decoded.id),
        columns: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        }
      });

      if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }

      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Not authorized as an admin" });
  }
};

module.exports = { protect, admin };
