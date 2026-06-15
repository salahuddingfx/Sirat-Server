const TeamMember = require("../models/teamMember.model");

const formatMember = (m) => {
  if (!m) return null;
  const obj = m.toObject ? m.toObject() : m;
  obj.id = obj._id;
  return obj;
};

const getActiveMembers = async () => {
  const members = await TeamMember.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
  return members.map(formatMember);
};

const getAllMembers = async () => {
  const members = await TeamMember.find().sort({ order: 1, createdAt: -1 });
  return members.map(formatMember);
};

const getMemberById = async (id) => {
  const member = await TeamMember.findById(id);
  return formatMember(member);
};

const createMember = async (memberData) => {
  const created = await TeamMember.create(memberData);
  return formatMember(created);
};

const updateMember = async (id, memberData) => {
  const updated = await TeamMember.findByIdAndUpdate(
    id,
    { $set: memberData },
    { new: true }
  );
  return formatMember(updated);
};

const deleteMember = async (id) => {
  const deleted = await TeamMember.findByIdAndDelete(id);
  return formatMember(deleted);
};

module.exports = {
  getActiveMembers,
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
};
