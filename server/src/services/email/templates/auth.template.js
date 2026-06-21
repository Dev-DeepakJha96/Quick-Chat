const config = require('../../../config/env.config');

const emailVerificationTemplate = (token) => {
  // const link = `${config.server.clientUrls[0]}/verify-email?token=${token}`;
  const link = `http://localhost:5000/verify-email?token=${token}`;

  return `
    <div>
      <h2>Verify Your Email</h2>
      <p>Click below link to verify your email:</p>
      <a href="${link}">Verify Email</a>
      <p>This link expires in 10 minutes.</p>
    </div>
  `;
};
const resetPasswordTemplate = (token) => {
  // const link = `${config.server.clientUrls[0]}/reset-password?token=${token}`;
  const link = `http://localhost:5000/api/v1/auth/reset-password?token=${token}`; //backend ka testing link he

  return `
    <div>
      <h2>Reset Your Password</h2>
      <p>Click below link to reset password:</p>
      <a href="${link}">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    </div>
  `;
};

module.exports = { emailVerificationTemplate, resetPasswordTemplate };
