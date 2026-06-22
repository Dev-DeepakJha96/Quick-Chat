const config = require('../config/env.config');
const logger = require('../config/logger.config');
const AppError = require('../utils/AppError');

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  // default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // log error
  logger.error(err.message, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
  });

  let error = err;

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new AppError(`Duplicate field value: ${value}. Please use another ${field}.`, 400);
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((el) => el.message);
    error = new AppError(`Invalid input data. ${messages.join('. ')}`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Your token has expired. Please log in again.', 401);
  }



  // development response
  if (config.isDevelopment) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      stack: error.stack,
      errors: error.errors || [],
      timestamp: new Date().toISOString(),
    });
  }

  // production response
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      errors: error.errors,
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
  });
};

module.exports = errorHandler;
