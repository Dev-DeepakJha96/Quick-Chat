const dotenv = require('dotenv');
const http = require('http');
const app = require('./app');
const config = require('./config/env.config');
const logger = require('./config/logger.config');
const { connectDB, closeDB } = require('./config/database.config');
const { initSocket } = require('./config/socket.config');

// Global mongoose reference for ready check
global.mongoose = require('mongoose');

dotenv.config({ path: '.env' });

/**
 * Initialize and start the server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);

    // ====================
    // Initialize Socket.io
    // ====================
    const io = initSocket(server);
    // Make io accessible in routes/controllers
    app.set('io', io);

    // Start listening
    server.listen(config.server.port, () => {
      logger.info('🚀 Server started successfully');
      logger.info(`📡 Environment: ${config.env}`);
      logger.info(`🔗 URL: http://${config.server.host}:${config.server.port}`);
      logger.info(`💚 Health check: http://${config.server.host}:${config.server.port}/health`);
      logger.info(`🔌 Socket.io: Running on ${config.server.port}`);
    });

    // ====================
    // Graceful Shutdown
    // ====================
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      // Close server first
      server.close(async () => {
        logger.info('HTTP server closed');
        // Close socket.io
        if (io) {
          io.close(() => {
            logger.info('Socket.io server closed');
          });
        }
        // Close database
        await closeDB();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();
