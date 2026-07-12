const nodemailer = require("nodemailer");
const env = require("../../config/env.config.js");
const logger = require("../../config/logger.config")

console.log(process.env.EMAIL_PASS);
console.log(process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: env.email.emailUser,
    pass: env.email.emailPass,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"QuickChat" <${env.email.emailUser}>`,
      to,
      subject,
      html,
    });

    logger.info(
      `Email sent to ${to.replace(/(.{3}).+(@)/, "$1***$2")}`,
      {
        subject,
        messageId: info.messageId,
      }
    );
  } catch (error) {
    logger.error("Email Error", {
      message: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

module.exports = {sendEmail}