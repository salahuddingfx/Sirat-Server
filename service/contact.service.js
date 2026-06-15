const Contact = require("../models/contact.model");

const formatContact = (c) => {
  if (!c) return null;
  const obj = c.toObject ? c.toObject() : c;
  obj.id = obj._id;
  return obj;
};

const createContact = async (contactData) => {
  const created = await Contact.create(contactData);
  return formatContact(created);
};

const getAllContacts = async () => {
  const contacts = await Contact.find().sort({ createdAt: -1 });
  return contacts.map(formatContact);
};

const markAsRead = async (id) => {
  const updated = await Contact.findByIdAndUpdate(
    id,
    { $set: { isRead: true } },
    { new: true }
  );
  return formatContact(updated);
};

const deleteContact = async (id) => {
  const deleted = await Contact.findByIdAndDelete(id);
  return formatContact(deleted);
};

module.exports = {
  createContact,
  getAllContacts,
  markAsRead,
  deleteContact,
};