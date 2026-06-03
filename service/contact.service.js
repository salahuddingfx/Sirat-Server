const { db } = require("../config/db.config");
const { contact } = require("../db/schema");
const { eq, desc } = require("drizzle-orm");
const crypto = require("crypto");

const createContact = async (contactData) => {
  const contactId = crypto.randomUUID();
  await db.insert(contact).values({
    id: contactId,
    ...contactData,
  });
  return await db.query.contact.findFirst({
    where: eq(contact.id, contactId),
  });
};

const getAllContacts = async () => {
  return await db.query.contact.findMany({
    orderBy: [desc(contact.createdAt)],
  });
};

const markAsRead = async (id) => {
  await db.update(contact)
    .set({ isRead: true })
    .where(eq(contact.id, id));
  return await db.query.contact.findFirst({
    where: eq(contact.id, id),
  });
};

const deleteContact = async (id) => {
  const deleted = await db.query.contact.findFirst({
    where: eq(contact.id, id),
  });
  if (deleted) {
    await db.delete(contact).where(eq(contact.id, id));
  }
  return deleted;
};

module.exports = {
  createContact,
  getAllContacts,
  markAsRead,
  deleteContact,
};