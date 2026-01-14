const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../modules/core/models/User');
const AuditLog = require('../modules/core/models/AuditLog');
const connectDB = require('../config/db');
const { connectRedis, getClient } = require('../config/redis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_URL = 'http://localhost:5000/api/auth';
const TEST_USER = {
    name: 'Session Tester',
    email: 'session@test.com',
    password: 'password123',
    organizationName: 'Session Corp'
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const testSession = async () => {
    try {
        console.log('--- Connecting to Infrastructure ---');
        await connectDB();
        await connectRedis();
        await delay(1000);

        console.log('\n--- Cleanup ---');
        await User.deleteOne({ email: TEST_USER.email });
        await AuditLog.deleteMany({ resource: 'User' }); // Warning: clears logs
        // Redis cleanup tricky without key, will check later

        console.log('\n--- 1. Register ---');
        await axios.post(`${API_URL}/register`, TEST_USER);
        console.log('Registered.');

        console.log('\n--- 2. Login ---');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        const { token, refreshToken, user } = loginRes.data;
        console.log('Login Success.');
        console.log('Access Token:', !!token);
        console.log('Refresh Token:', !!refreshToken);

        console.log('\n--- 3. Verify Redis Session ---');
        const redisClient = getClient();
        const sessionKey = `session:${user.id}:${refreshToken}`;
        const sessionData = await redisClient.get(sessionKey);
        console.log('Redis Session Exists:', !!sessionData);

        console.log('\n--- 4. Verify Audit Log ---');
        // Wait for async log
        await delay(1000);
        const log = await AuditLog.findOne({ action: 'LOGIN', user: user.id });
        console.log('Audit Log Found:', !!log);
        if (log) console.log('Log Details:', log.action, log.ip);

        console.log('\n--- 5. Refresh Token ---');
        const refreshRes = await axios.post(`${API_URL}/refresh-token`, {
            userId: user.id,
            refreshToken
        });
        console.log('New Access Token Received:', !!refreshRes.data.token);

        console.log('\n--- 6. Logout ---');
        await axios.post(`${API_URL}/logout`, { refreshToken }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Logout Success.');

        console.log('\n--- 7. Verify Session Revocation ---');
        const revokdeSession = await redisClient.get(sessionKey);
        console.log('Redis Session Gone:', !revokdeSession);

        console.log('\n--- Cleanup ---');
        await User.deleteOne({ email: TEST_USER.email });
        process.exit(0);

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

testSession();
