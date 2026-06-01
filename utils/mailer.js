const nodemailer = require('nodemailer');
const env = require('../config/env.config');

const smtpPort = Number(env.mail?.smtpPort || 587);

const transporter = nodemailer.createTransport({
  host: env.mail?.smtpHost || 'smtp-relay.brevo.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: env.mail?.smtpUser,
    pass: env.mail?.smtpPass
  },
  tls: {
    rejectUnauthorized: false
  }
});

function htmlToText(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Send transactional email over SMTP relay.
 * @param {{to: {email:string,name?:string}[]|{email:string,name?:string}, subject:string, html:string, text?:string, sender?: {email:string,name?:string}, replyTo?: string}} options
 */
async function sendEmail({ to = [], subject = '', html = '', text = '', sender = null, replyTo = null }) {
  if (!env.mail?.smtpUser || !env.mail?.smtpPass) {
    throw new Error('SMTP credentials not configured (SMTP_USER / SMTP_PASS).');
  }

  const fromEmail = env.mail?.fromEmail || env.mail?.smtpUser;
  const fromName = env.mail?.fromName || 'Sirat';
  const normalizedText = text || htmlToText(html) || subject || 'New message from Sirat';

  const mailOptions = {
    from: sender || `${fromName} <${fromEmail}>`,
    to: Array.isArray(to)
      ? to.map((item) => (typeof item === 'string' ? item : item.email)).filter(Boolean).join(', ')
      : (typeof to === 'string' ? to : to.email),
    subject,
    html,
    text: normalizedText,
    replyTo: replyTo || undefined
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };