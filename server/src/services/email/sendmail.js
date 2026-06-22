const nodemailer = require('nodemailer');
const env = require('../../config/env.config.js');
const logger = require('../../config/logger.config');

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
  try {
    await transporter.sendMail({
      from: `"Deepak" <${env.email.emailUser}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to.replace(/(.{3}).+(@)/, '$1***$2')}`, { subject });
  } catch (error) {
    logger.error(`Failed to send email to ${to}`, { subject, error: error.message });
    throw error;
  }
};

module.exports = { sendEmail };
