const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports = async function globalSetup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  // Store URI for tests to access
  process.env.MONGO_MEMORY_URI = uri;
};
