const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const env = require("../config/env.config");

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

/**
 * Uploads a local file to Cloudinary and deletes the local temporary file
 * @param {string} filePath - Absolute path to the local file
 * @param {string} folderName - Subfolder suffix under 'sirat' (e.g., 'products', 'users')
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
const uploadToCloudinary = async (filePath, folderName = "misc") => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at: ${filePath}`);
    }

    // Folders naming alignment matching user specifications
    let subfolder = folderName;
    if (folderName === "users") {
      subfolder = "usersimages";
    }

    const uploadOptions = {
      folder: `sirat/${subfolder}`,
      resource_type: "auto",
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // Clean up local temp file synchronously
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkErr) {
      console.warn(`Failed to clean up local temp file: ${unlinkErr.message}`);
    }

    return result.secure_url;
  } catch (error) {
    // Make sure we delete local file even if upload fails
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
    }
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
