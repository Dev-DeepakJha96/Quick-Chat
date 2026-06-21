const User = require('../models/User');
const asyncHandler = require('../utils/asyncHanlder');
const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Get token
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    return next(new AppError('Invalid or expired token.', 401));
  }

  // 3. Find user
  const user = await User.findById(decoded.sub);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. Password change check
  if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password recently changed. Please login again.', 401));
  }

  req.user = user;
  next();
});

module.exports = { protect };
