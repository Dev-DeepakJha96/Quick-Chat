const AppError = require('../utils/AppError');
const logger = require('../config/logger.config');

const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      req[source] = await schema.parseAsync(req[source]);

      next();
    } catch (error) {

      const errors =
        error?.issues?.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })) || [];

      logger.error('Validation Error',{
        issues: errors, 
        requestId: req.requestId, 
      });
      next(new AppError('Validation failed', 400,errors));
    }
  };
};

module.exports = { validate };
