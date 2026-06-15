const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const env = require("../config/env.config");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, env.jwtSecret);
      
      const user = await User.findById(decoded.id).select("name email role avatar");

      if (!user) {
        return res.status(401).json({ success: false, message: "User no longer exists" });
      }

      req.user = user.toObject();
      req.user.id = req.user._id; // client/admin compatibility
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
