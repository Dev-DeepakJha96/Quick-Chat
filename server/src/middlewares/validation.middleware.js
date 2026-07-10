const AppError = require('../utils/AppError');
const logger = require('../config/logger.config');

const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      req[source] = await schema.parseAsync(req[source]);

      next();
    } catch (error) {
      console.log('--- VALIDATION ERROR DEBUG ---');
      console.log('Source:', source);
      console.log('Payload:', JSON.stringify(req[source], null, 2));
      console.log('Zod Error Issues:', JSON.stringify(error?.issues, null, 2));
      console.log('------------------------------');

      const errors =
        error?.issues?.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })) || [];

      logger.error('Validation Error', {
        issues: errors,
        requestId: req.requestId,
      });
      next(new AppError('Validation failed', 400, errors));
    }
  };
};

module.exports = { validate };
