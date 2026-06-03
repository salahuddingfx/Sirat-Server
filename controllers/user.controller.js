const userService = require("../service/user.service");

const getProfile = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, username, addresses } = req.body;
    
    let updateData = {
      name,
      phone,
      username,
    };

    if (req.file) {
      updateData.avatar = req.file.path; // Cloudinary URL
    }

    if (addresses) {
      try {
        updateData.addresses = typeof addresses === "string" ? JSON.parse(addresses) : addresses;
      } catch (e) {
        console.error("Failed to parse addresses:", addresses);
      }
    }

    const updatedUser = await userService.updateUserProfile(req.user.id, updateData);

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(400).json({ 
      success: false, 
      message: error.code === "P2002" ? "Username or Phone already exists." : error.message 
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
