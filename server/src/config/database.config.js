const mongoose = require('mongoose');
const logger = require('./logger.config');
const config = require('./env.config');

const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000;
  try {
    logger.info('Connecting to MongoDB...', {
      uri: config.database.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
    });

    await mongoose.connect(config.database.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    if (retryCount < MAX_RETRIES) {
      logger.info(
        `Retrying connection in ${RETRY_DELAY / 1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
    } else {
      logger.error('Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
};

module.exports = { connectDB, closeDB };
