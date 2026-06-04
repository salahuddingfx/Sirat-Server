const userService = require("../service/user.service");
const { getPublicUrl } = require("../config/multer.config");

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
      updateData.avatar = getPublicUrl(req, req.file);
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

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }
    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
