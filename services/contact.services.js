const Contact = require("../models/contact.model");

const createContact = async (contactData) => {
  return await Contact.create(contactData);
};

const getAllContacts = async () => {
  return await Contact.find().sort({ createdAt: -1 });
};

const markAsRead = async (id) => {
  return await Contact.findByIdAndUpdate(id, { isRead: true }, { new: true });
};

const deleteContact = async (id) => {
  return await Contact.findByIdAndDelete(id);
};

module.exports = {
  createContact,
  getAllContacts,
  markAsRead,
  deleteContact,
};
