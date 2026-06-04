const { db } = require("../config/db.config");
const { teammember } = require("../db/schema");
const { eq, asc, desc } = require("drizzle-orm");
const crypto = require("crypto");

const getActiveMembers = async () => {
  return await db.query.teammember.findMany({
    where: eq(teammember.isActive, true),
    orderBy: [asc(teammember.order), asc(teammember.createdAt)],
  });
};

const getAllMembers = async () => {
  return await db.query.teammember.findMany({
    orderBy: [asc(teammember.order), desc(teammember.createdAt)],
  });
};

const getMemberById = async (id) => {
  return await db.query.teammember.findFirst({
    where: eq(teammember.id, id),
  });
};

const createMember = async (memberData) => {
  const memberId = crypto.randomUUID();
  await db.insert(teammember).values({
    id: memberId,
    ...memberData,
  });
  return await db.query.teammember.findFirst({
    where: eq(teammember.id, memberId),
  });
};

const updateMember = async (id, memberData) => {
  await db.update(teammember)
    .set(memberData)
    .where(eq(teammember.id, id));
  return await db.query.teammember.findFirst({
    where: eq(teammember.id, id),
  });
};

const deleteMember = async (id) => {
  const deleted = await db.query.teammember.findFirst({
    where: eq(teammember.id, id),
  });
  if (deleted) {
    await db.delete(teammember).where(eq(teammember.id, id));
  }
  return deleted;
};

module.exports = {
  getActiveMembers,
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
};
