const nodemailer = require('nodemailer');
const env = require('../../config/env.config.js');

const transporter = nodemailer.createTransport({
  host: env.email.emailHost,
  port: env.email.emailPort,
  secure: false,
  auth: {
    user: env.email.emailUser,
    pass: env.email.emailPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Deepak" <${env.email.emailUser}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };
