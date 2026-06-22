const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const config = require('./config/env.config');
const logger = require('./config/logger.config');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/error.middleware');
const mongoose = require('mongoose');
const AppError = require('./utils/AppError');
const routes = require('./routes/index');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (config.server.clientUrls.indexOf(origin) !== -1 || config.isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => config.isDevelopment && req.path === '/health', // Skip rate limit for health check in dev
});
app.use('/api', limiter);

if (config.isDevelopment) {
  app.use(
    morgan('dev', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
}
if (config.isProduction) {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
    });
    next();
  });
}

app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    requestId: req.requestId,
  });
});

// Ready check (for orchestration)
app.get('/ready', (req, res) => {
  const dbState = mongoose?.connection?.readyState;
  const isDbConnected = dbState === 1;

  if (isDbConnected) {
    res.status(200).json({ status: 'ready', database: 'connected' });
  } else {
    res.status(503).json({ status: 'not ready', database: dbState });
  }
});

app.use('/api/v1', routes);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    docs: '/health',
  });
});

//not found middlware for unknown routes
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});
app.use(errorHandler);

module.exports = app;
