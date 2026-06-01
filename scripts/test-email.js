require('dotenv').config();
const { sendEmail } = require('../utils/mailer');

(async () => {
  try {
    const to = [{ email: process.env.SMTP_USER }];
    const resp = await sendEmail({
      to,
      subject: 'Test email from Sirat server',
      html: '<p>This is a test email sent using Brevo transactional API.</p>'
    });
    console.log('Email sent response:', resp);
    process.exit(0);
  } catch (err) {
    console.error('Error sending test email:', err);
    process.exit(1);
  }
})();
