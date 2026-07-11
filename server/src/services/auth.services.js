const User = require('../models/User');
const { hashToken, generateRandomToken } = require('../utils/crypto');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const logger = require('../config/logger.config');
const { sendEmail } = require('./email/sendmail');
const {
  emailVerificationTemplate,
  resetPasswordTemplate,
} = require('./email/templates/auth.template');

exports.registerUser = async ({ username, email, password }) => {
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      throw new AppError('Email is already registered', 400);
    }

    if (existingUser.username === username.toLowerCase()) {
      throw new AppError('Username is already taken', 400);
    }
  }

  const rawToken = generateRandomToken();
  const hashedToken = hashToken(rawToken);

  const user = await User.create({
    username,
    email,
    password,
    emailVerificationToken: hashedToken,
    emailVerificationExpires: Date.now() + 10 * 60 * 1000,
  });

  // Note: Tokens are NOT generated on registration
  // User must verify email first, then login to get tokens
  // This prevents bypassing email verification

  logger.info(`User created: ${email}`);

  // Fire-and-forget email — user creation already succeeded
   sendEmail({
    to: email,
    subject: 'Verify Your Email',
    html: emailVerificationTemplate(rawToken),
  }).catch((err) => {
    logger.error('Verification email failed, user still created:', err);
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

  logger.info(`Email verified for user: ${user._id}`);
  return user;
};

exports.loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +lockedUntil +failedLoginAttempts');
  
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if account is locked
  if (user.isLocked()) {
    const lockTimeRemaining = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    throw new AppError(`Account is locked. Please try again in ${lockTimeRemaining} minutes.`, 423);
  }

  // Check password
  if (!(await user.comparePassword(password))) {
    // Increment failed attempts
    await user.incrementLoginAttempts();
    
    const remainingAttempts = 5 - (user.failedLoginAttempts + 1);
    if (remainingAttempts <= 0) {
      throw new AppError('Account has been locked due to too many failed attempts. Please try again in 15 minutes.', 423);
    }
    
    throw new AppError(`Invalid credentials. ${remainingAttempts} attempts remaining.`, 401);
  }

  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  if (!user.isEmailVerified) throw new AppError('Email not verified', 403);

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshToken = hashToken(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  logger.info(`User logged in: ${user.email}`);
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

  logger.info(`Token refreshed for user: ${user._id}`);
  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
};

exports.logoutUser = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }
  logger.info(`User logged out: ${userId}`);
  return true;
};

exports.getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

exports.updateUserProfile = async (userId, updateDataVars) => {
  const { username, email, avatarColor, avatar } = updateDataVars;

  const updateData = {};

  if (username) updateData.username = username.toLowerCase();
  if (email) updateData.email = email.toLowerCase();
  if (avatarColor) updateData.avatarColor = avatarColor;
  if (avatar !== undefined) updateData.avatar = avatar;


  // If nothing to update
  if (Object.keys(updateData).length === 0) {
    throw new AppError('No data provided for update', 400);
  }

  // Check duplicates
  if (username || email) {
    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [
        ...(username ? [{ username: username.toLowerCase() }] : []),
        ...(email ? [{ email: email.toLowerCase() }] : []),
      ],
    });

    if (existingUser) {
      if (username && existingUser.username === username.toLowerCase()) {
        throw new AppError('Username is already taken', 400);
      }

      if (email && existingUser.email === email.toLowerCase()) {
        throw new AppError('Email is already registered', 400);
      }
    }
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  logger.info(`User profile updated: ${updatedUser.username}`);

  return updatedUser;
};
exports.changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();
  const accessToken = signAccessToken(userId);
  logger.info(`Password changed for user: ${user.username}`);

  return accessToken;
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
  }).catch((err) => {
    logger.error('Password reset email failed, token still generated:', err);
  });

  logger.info(`Password reset token generated for: ${email}`);
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

  logger.info(`Password reset completed`);
  return true;
};
