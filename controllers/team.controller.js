const teamService = require("../service/team.service");
const cache = require("../config/cache.config");
const { getPublicUrl } = require("../config/multer.config");

const getActiveTeam = async (req, res) => {
  try {
    const members = await cache.getOrSet(
      cache.buildKey("team", "active"),
      () => teamService.getActiveMembers(),
      180
    );
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetAllMembers = async (req, res) => {
  try {
    const members = await cache.getOrSet(
      cache.buildKey("team", "all"),
      () => teamService.getAllMembers(),
      30
    );
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetMemberById = async (req, res) => {
  try {
    const member = await teamService.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminCreateMember = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.avatar = getPublicUrl(req, req.file);
    data.isActive = data.isActive === "true" || data.isActive === true;
    data.order = parseInt(data.order) || 0;
    if (data.twitter === undefined) data.twitter = "";
    if (data.linkedin === undefined) data.linkedin = "";
    if (data.github === undefined) data.github = "";
    if (data.instagram === undefined) data.instagram = "";
    if (data.facebook === undefined) data.facebook = "";
    if (data.website === undefined) data.website = "";
    const member = await teamService.createMember(data);
    cache.invalidateNamespace("team");
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminUpdateMember = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.avatar = getPublicUrl(req, req.file);
    data.isActive = data.isActive === "true" || data.isActive === true;
    data.order = parseInt(data.order) || 0;
    const member = await teamService.updateMember(req.params.id, data);
    if (!member) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }
    cache.invalidateNamespace("team");
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminDeleteMember = async (req, res) => {
  try {
    const deleted = await teamService.deleteMember(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }
    cache.invalidateNamespace("team");
    res.status(200).json({ success: true, message: "Team member deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getActiveTeam,
  adminGetAllMembers,
  adminGetMemberById,
  adminCreateMember,
  adminUpdateMember,
  adminDeleteMember,
};
