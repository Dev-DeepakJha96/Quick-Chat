const { Resend } = require('resend');
const env = require('../../config/env.config.js');
const logger = require('../../config/logger.config');

const resend = new Resend(env.email.apiKey);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const fromAddress = env.email.fromEmail.includes('<') 
      ? env.email.fromEmail 
      : `QuickChat <${env.email.fromEmail}>`;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    if (error) {
      throw error;
    }

    logger.info(`Email sent via Resend to ${to.replace(/(.{3}).+(@)/, '$1***$2')}`, { 
      subject,
      emailId: data?.id 
    });
  } catch (error) {
    logger.error('Email Error via Resend', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = { sendEmail };
