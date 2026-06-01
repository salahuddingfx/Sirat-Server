const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const env = require("./env.config");

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "sirat_products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      { width: 1000, crop: "limit", quality: "auto", fetch_format: "auto" }
    ]
  },
});

module.exports = { cloudinary, storage };
