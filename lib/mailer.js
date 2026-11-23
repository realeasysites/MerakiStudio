'use strict';
const nodemailer = require('nodemailer');

// Optional email alerts. Set NOTIFY_EMAIL plus SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
// (e.g. a Gmail app password) to get an email every time a request comes in.
let transport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function notify(subject, lines) {
  const to = process.env.NOTIFY_EMAIL;
  if (!transport || !to) return false;
  try {
    await transport.sendMail({
      from: `"Meraki Studio Website" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: lines.filter(Boolean).join('\n') + '\n\nView and manage requests: /admin'
    });
    return true;
  } catch (err) {
    console.error('Email notify failed:', err.message);
    return false;
  }
}

module.exports = { notify };
