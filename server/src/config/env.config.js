const dotenv = require('dotenv');
dotenv.config();

const requiredVars = ['NODE_ENV', 'CLIENT_URL', 'MONGODB_URI', 'JWT_SECRET'];

requiredVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Enviournment variable ${envVar} is missing!`);
  }
});

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    host: process.env.HOST || 'localhost',
    clientUrls: process.env.CLIENT_URL.split(',').map((url) => url.trim()),
  },

  database: {
    uri: process.env.MONGODB_URI,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieExpiresIn: parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileEnabled: process.env.LOG_FILE_ENABLED == 'true',
  },
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },
};

module.exports = config;
