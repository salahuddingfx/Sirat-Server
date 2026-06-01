const User = require("../models/user.model");

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, username, addresses } = req.body;
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = name || user.name;
      user.phone = phone || user.phone;
      user.username = username || user.username;
      
      if (req.file) {
          user.avatar = req.file.path; // Cloudinary URL
      }

      if (addresses) {
          try {
              // Addresses might be sent as string if multipart/form-data
              user.addresses = typeof addresses === 'string' ? JSON.parse(addresses) : addresses;
          } catch (e) {
              console.error("Failed to parse addresses:", addresses);
          }
      }

      const updatedUser = await user.save();
      const userToReturn = updatedUser.toObject();
      delete userToReturn.password;

      res.status(200).json({ success: true, data: userToReturn });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(400).json({ 
        success: false, 
        message: error.code === 11000 ? "Username or Phone already exists." : error.message 
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
