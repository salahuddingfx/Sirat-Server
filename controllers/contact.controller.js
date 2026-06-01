const contactService = require("../service/contact.services");
const { sendContactNotification } = require("../service/mail.service");

const submitContactForm = async (req, res) => {
  try {
    const contact = await contactService.createContact(req.body);

    (async () => {
      try {
        await sendContactNotification(contact);
      } catch (e) {
        console.error('Failed to send contact notification email:', e.message || e);
      }
    })();

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminGetAllContacts = async (req, res) => {
  try {
    const contacts = await contactService.getAllContacts();
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminMarkAsRead = async (req, res) => {
  try {
    const contact = await contactService.markAsRead(req.params.id);
    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const adminDeleteContact = async (req, res) => {
  try {
    await contactService.deleteContact(req.params.id);
    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitContactForm,
  adminGetAllContacts,
  adminMarkAsRead,
  adminDeleteContact,
};