const winston = require('winston');
const path = require('path');
const config = require('./env.config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if exists and not empty
    if (Object.keys(meta).length > 0 && meta.stack !== stack) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // Add stack trace if exists
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Console format for development (pretty)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0 && meta.stack !== undefined) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create transports array
const transports = [
  new winston.transports.Console({
    format: config.isDevelopment ? consoleFormat : logFormat,
    level: config.logging.level,
  }),
];

// Add file transport if enabled (production usually)
if (config.logging.fileEnabled || config.isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: logFormat,
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = logger;
