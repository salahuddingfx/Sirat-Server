const { sendNewsletterWelcomeEmail } = require("../service/mail.service");

const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) throw new Error("Email is required");

    // In a real app, we'd save this to a Newsletter model
    // For now, we'll just send the welcome email
    
    (async () => {
        try {
            await sendNewsletterWelcomeEmail(email);
        } catch (err) {
            console.error("Newsletter email failed:", err);
        }
    })();

    res.status(200).json({ success: true, message: "Subscribed successfully!" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  subscribeNewsletter,
};
