const { uploadToCloudinary } = require("../utils/cloudinary");

const cloudinaryUploadMiddleware = async (req, res, next) => {
  try {
    let folder = "misc";
    const url = req.originalUrl || "";
    
    if (url.includes("/products")) {
      folder = "products";
    } else if (url.includes("/users")) {
      folder = "users";
    } else if (url.includes("/categories")) {
      folder = "categories";
    } else if (url.includes("/settings")) {
      folder = "settings";
    } else if (url.includes("/hero")) {
      folder = "hero";
    } else if (url.includes("/team")) {
      folder = "team";
    }

    if (req.file) {
      const secureUrl = await uploadToCloudinary(req.file.path, folder);
      req.file.cloudinaryUrl = secureUrl;
    }

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const secureUrl = await uploadToCloudinary(file.path, folder);
        file.cloudinaryUrl = secureUrl;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = cloudinaryUploadMiddleware;
