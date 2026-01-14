const { connectRedis, getClient } = require('../config/redis');
const { setCache, getCache, deleteCache } = require('./cache.utils');
require('dotenv').config({ path: '../../.env' });

const testRedis = async () => {
    console.log('--- Testing Redis Cache ---');
    await connectRedis();

    // Give it a moment to connect
    await new Promise(resolve => setTimeout(resolve, 1000));

    const client = getClient();
    if (!client || !client.isOpen) {
        console.log('Redis not connected (Skipping test)');
        process.exit(0);
    }

    console.log('1. Setting Cache...');
    await setCache('test_key', { message: 'Hello Redis' }, 60);

    console.log('2. Getting Cache...');
    const data = await getCache('test_key');
    console.log('Data retrieved:', data);

    console.log('3. Deleting Cache...');
    await deleteCache('test_key');

    console.log('4. Verifying Deletion...');
    const deletedData = await getCache('test_key');
    console.log('Data after delete:', deletedData);

    console.log('Done.');
    process.exit(0);
};

testRedis();
