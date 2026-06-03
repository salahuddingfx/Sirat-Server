const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Root uploads folder
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage Configuration with Subfolders
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subfolder = "misc";
    const url = req.originalUrl || "";
    
    if (url.includes("/products")) {
      subfolder = "products";
    } else if (url.includes("/users")) {
      subfolder = "users";
    } else if (url.includes("/categories")) {
      subfolder = "categories";
    } else if (url.includes("/settings")) {
      subfolder = "settings";
    } else if (url.includes("/hero")) {
      subfolder = "hero";
    }
    
    const targetDir = path.join(uploadsDir, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File Filter for Images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only images (.jpg, .jpeg, .png, .webp) are allowed!"));
  }
};

// Helper to get public URL from uploaded file
const getPublicUrl = (req, file) => {
  if (!file) return null;
  const parts = file.path.split(/[\\/]uploads[\\/]/);
  const relativePath = parts[1] || file.filename;
  return `${req.protocol}://${req.get("host")}/uploads/${relativePath.replace(/\\/g, "/")}`;
};

module.exports = { storage, fileFilter, getPublicUrl };
