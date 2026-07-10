const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connect() {
  if (mongoose.connection.readyState === 0) {
    let uri = process.env.TEST_MONGO_URI;
    if (!uri) {
      mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '6.0.14'
        }
      });
      uri = mongoServer.getUri();
    }
    await mongoose.connect(uri);
  }
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

module.exports = { connect, disconnect, clearDatabase };
