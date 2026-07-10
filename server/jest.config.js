module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/database.config.js',
    '!src/config/logger.config.js'
  ],
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
};
