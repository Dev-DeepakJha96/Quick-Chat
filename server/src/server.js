const dotenv = require('dotenv');
const app = require('./app');
const config = require('./config/env.config');
const { connectDB, closeDB } = require('./config/database.config');
const http = require('http');
const logger = require('./config/logger.config');

dotenv.config();

const startServer = async () => {
  try {
    await connectDB();
    const server = http.createServer(app);
    server.listen(config.server.port, () => {
      logger.info('🚀 Server started successfully');
      logger.info(`📡 Environment: ${config.env}`);
      logger.info(`🔗 URL: http://${config.server.host}:${config.server.port}`);
      logger.info(`💚 Health check: http://${config.server.host}:${config.server.port}/health`);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        await closeDB();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
  } catch (error) {
    logger.error('failed to start server: ', error);
    process.exit(1);
  }
};

startServer();
