const { getClient } = require('../config/redis');

// Set cache with expiration (default 1 hour)
const setCache = async (key, value, duration = 3600) => {
    const client = getClient();
    if (!client || !client.isOpen) return;
    try {
        await client.set(key, JSON.stringify(value), {
            EX: duration
        });
    } catch (error) {
        console.error('Redis Set Error:', error);
    }
};

// Get cache
const getCache = async (key) => {
    const client = getClient();
    if (!client || !client.isOpen) return null;
    try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Redis Get Error:', error);
        return null;
    }
};

// Delete cache
const deleteCache = async (key) => {
    const client = getClient();
    if (!client || !client.isOpen) return;
    try {
        await client.del(key);
    } catch (error) {
        console.error('Redis Delete Error:', error);
    }
};

module.exports = { setCache, getCache, deleteCache };
