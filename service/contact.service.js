const { prisma } = require("../config/db.config");

const createContact = async (contactData) => {
  return await prisma.contact.create({
    data: contactData,
  });
};

const getAllContacts = async () => {
  return await prisma.contact.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const markAsRead = async (id) => {
  return await prisma.contact.update({
    where: { id },
    data: { isRead: true },
  });
};

const deleteContact = async (id) => {
  return await prisma.contact.delete({
    where: { id },
  });
};

module.exports = {
  createContact,
  getAllContacts,
  markAsRead,
  deleteContact,
};