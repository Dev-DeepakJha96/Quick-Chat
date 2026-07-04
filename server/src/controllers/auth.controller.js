const authService = require('../services/auth.services');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const config = require('../config/env.config');
const logger = require('../config/logger.config');

const setAuthCookies = (res, accessToken, refreshToken) => {
  if (accessToken !== undefined) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });
  }

  if (refreshToken !== undefined) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
};

exports.register = asyncHandler(async (req, res) => {
  console.log(req.body);
  const result = await authService.registerUser(req.body);
  logger.info(`User registered: ${result.user.email}`, { requestId: req.requestId });
  res.status(201).json(ApiResponse.created(result, 'User registered successfully'));
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.body.token);
  logger.info(`Email verified for user: ${user._id}`, { requestId: req.requestId });
  res.status(200).json(ApiResponse.success(user, 'Email verified successfully'));
});

exports.login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
  logger.info(`User logged in: ${user.email}`, { requestId: req.requestId });
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json(ApiResponse.success({ user, accessToken }, 'Login successful'));
});

exports.refresh = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.refreshUserToken(
    req.cookies.refreshToken
  );
  logger.info(`Token refreshed`, { requestId: req.requestId });
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json(ApiResponse.success({ accessToken }, 'Token refreshed'));
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  logger.info(`User logged out: ${req.user._id}`, { requestId: req.requestId });
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user._id);
  res.status(200).json(ApiResponse.success({ user }, 'User profile fetched'));
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateUserProfile(req.user._id, req.body);
  res.status(200).json(ApiResponse.success({ user }, 'Profile updated'));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const accessToken = await authService.changePassword(req.user._id, currentPassword, newPassword);
  setAuthCookies(res, accessToken);
  res.status(200).json(ApiResponse.success(null, 'password changed successfully'));
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  logger.info(`Password reset requested`, { requestId: req.requestId });
  res.status(200).json(ApiResponse.success(null, 'Password reset link sent to email'));
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  logger.info(`Password reset completed`, { requestId: req.requestId });
  res.status(200).json(ApiResponse.success(null, 'Password reset successful'));
});
