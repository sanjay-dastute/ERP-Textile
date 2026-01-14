const redis = require('redis');

let client;

const connectRedis = async () => {
    try {
        client = redis.createClient({
            url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
        });

        client.on('error', (err) => console.log('Redis Client Error', err));
        client.on('connect', () => console.log('Redis Connected'));

        await client.connect();
    } catch (error) {
        console.error('Could not connect to Redis:', error.message);
        // Do not exit process, Redis might be optional
    }
};

const getClient = () => client;

module.exports = { connectRedis, getClient };
