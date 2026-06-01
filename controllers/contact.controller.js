const contactService = require("../services/contact.services");
const Settings = require("../models/settings.model");
const { sendEmail } = require("../utils/mailer");

const submitContactForm = async (req, res) => {
  try {
    const contact = await contactService.createContact(req.body);

    // Notify site admin via email (best-effort, non-blocking)
    (async () => {
      try {
        const settings = await Settings.findOne() || {};
        const adminEmail = settings.email || process.env.SMTP_USER;
        if (adminEmail) {
          await sendEmail({
            to: [{ email: adminEmail }],
            subject: `New contact form from ${contact.name}`,
            html: `<p><strong>Name:</strong> ${contact.name}</p>
                   <p><strong>Email:</strong> ${contact.email}</p>
                   <p><strong>Message:</strong></p>
                   <p>${contact.message}</p>`,
            replyTo: contact.email
          });
        }
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
