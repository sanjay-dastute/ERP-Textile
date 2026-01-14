const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    jest.setTimeout(30000); // Increase timeout to 30s
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_EXPIRE = '1d';
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Mock Redis Utils Globally
jest.mock('../utils/cache.utils', () => ({
    setCache: jest.fn().mockResolvedValue('OK'),
    getCache: jest.fn().mockResolvedValue(null),
    deleteCache: jest.fn().mockResolvedValue(1),
}));
