const User = require('../models/User');
const { hashToken, generateRandomToken } = require('../utils/crypto');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const { sendEmail } = require('./email/sendmail');
const {
  emailVerificationTemplate,
  resetPasswordTemplate,
} = require('./email/templates/auth.template');

exports.registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('User already exists', 400);

  const rawToken = generateRandomToken();
  const hashedToken = hashToken(rawToken);

  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: Date.now() + 10 * 60 * 1000,
  });

  sendEmail({
    to: email,
    subject: 'Verify Your Email',
    html: emailVerificationTemplate(rawToken),
  });

  return { user, verificationToken: rawToken };
};

exports.verifyEmail = async (token) => {
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Invalid or expired verification token', 400);

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return user;
};

exports.loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isEmailVerified) throw new AppError('Email not verified', 403);

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshToken = hashToken(refreshToken);
  await user.save();

  return { user, accessToken, refreshToken };
};

exports.refreshUserToken = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token missing', 400);

  const { verifyRefreshToken } = require('../utils/jwt');
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await User.findById(decoded.sub).select('+refreshToken');
  if (!user || user.refreshToken !== hashToken(refreshToken)) {
    throw new AppError('Invalid refresh token', 401);
  }

  const newAccessToken = signAccessToken(user._id);
  const newRefreshToken = signRefreshToken(user._id);

  user.refreshToken = hashToken(newRefreshToken);
  await user.save();

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
};

exports.logoutUser = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }
  return true;
};

exports.getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

exports.updateUserProfile = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { name: updateData.name },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('User not found', 404);
  return user;
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return true;

  const resetToken = generateRandomToken();
  const hashedToken = hashToken(resetToken);

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: resetPasswordTemplate(resetToken),
  });

  return resetToken;
};

exports.resetPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshToken = undefined;
  await user.save();

  return true;
};
