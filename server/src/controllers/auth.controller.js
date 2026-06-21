const authService = require('../services/auth.services');
const asyncHandler = require('../utils/asyncHanlder');
const ApiResponse = require('../utils/ApiResponse');
const config = require('../config/env.config');

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json(ApiResponse.created(result, 'User registered successfully'));
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.body.token);
  res.status(200).json(ApiResponse.success(user, 'Email verified successfully'));
});

exports.login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json(ApiResponse.success({ user, accessToken }, 'Login successful'));
});

exports.refresh = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.refreshUserToken(
    req.cookies.refreshToken
  );
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json(ApiResponse.success({ accessToken }, 'Token refreshed'));
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.status(200).json(ApiResponse.success(null, 'Logged out successfully'));
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user._id);
  res.status(200).json(ApiResponse.success(user, 'User profile fetched'));
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateUserProfile(req.user._id, req.body);
  res.status(200).json(ApiResponse.success(user, 'Profile updated'));
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const resetToken = await authService.forgotPassword(req.body.email);
  res.status(200).json(ApiResponse.success({ resetToken }, 'Password reset link sent to email'));
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json(ApiResponse.success(null, 'Password reset successful'));
});
