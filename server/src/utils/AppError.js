  
  class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);

    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? 'error' : 'fail';
    this.success = false;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request') {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Not Found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflict') {
    return new AppError(message, 409);
  }

  static internal(message = 'Internal Server Error') {
    return new AppError(message, 500);
  }
}

module.exports = AppError;