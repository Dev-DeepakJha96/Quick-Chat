class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);

    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? 'error' : 'fail';
    this.success = false;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request') {
    return new AppError(message, 400);
  }

  static notFound(message = 'Not Found') {
    return new AppError(message, 404);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }
}

module.exports = AppError;
