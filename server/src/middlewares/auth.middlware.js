const User = require('../models/User');
const asyncHandler = require('../utils/asyncHanlder');
const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const logger = require('../config/logger.config');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn('Auth: No token provided', { requestId: req.requestId, ip: req.ip });
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    logger.warn('Auth: Invalid or expired token', { requestId: req.requestId, ip: req.ip });
    return next(new AppError('Invalid or expired token.', 401));
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    logger.warn('Auth: User from token no longer exists', {
      requestId: req.requestId,
      userId: decoded.sub,
    });
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
    logger.warn('Auth: Password recently changed, re-login required', {
      requestId: req.requestId,
      userId: user._id,
    });
    return next(new AppError('Password recently changed. Please login again.', 401));
  }

  req.user = user;
  next();
});

module.exports = { protect };
