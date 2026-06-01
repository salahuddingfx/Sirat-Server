const env = require('../config/env.config');
const https = require('https');

function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url);
      const body = JSON.stringify(data);
      const opts = {
        hostname: parsed.hostname,
        path: parsed.pathname + (parsed.search || ''),
        method: 'POST',
        headers: Object.assign({
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }, headers)
      };

      const req = https.request(opts, (res) => {
        let chunks = '';
        res.on('data', (c) => chunks += c);
        res.on('end', () => {
          const status = res.statusCode;
          const text = chunks || '';
          if (status >= 200 && status < 300) {
            try { resolve(JSON.parse(text || '{}')); } catch (e) { resolve({}); }
          } else {
            const err = new Error(`HTTP ${status} ${res.statusMessage}`);
            err.status = status;
            err.body = text;
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Send transactional email using Brevo (Sendinblue) transactional API.
 * @param {{to: {email:string,name?:string}[]|{email:string,name?:string}, subject:string, html:string, text?:string, sender?: {email,name}}} options
 */
async function sendEmail({ to = [], subject = '', html = '', text = '', sender = null }) {
  const apiKey = env.mail?.brevoApiKey;
  if (!apiKey) throw new Error('Brevo API key not configured (BREVO_API_KEY).');

  const payload = {
    sender: sender || { name: 'Sirat', email: env.mail?.smtpUser || 'no-reply@yourdomain.com' },
    to: Array.isArray(to) ? to : [to],
    subject,
    htmlContent: html,
    textContent: text
  };

  const url = 'https://api.brevo.com/v3/smtp/email';
  const headers = { 'api-key': apiKey };
  return postJson(url, payload, headers);
}

module.exports = { sendEmail };
