const axios = require('axios');
const speakeasy = require('speakeasy');
const mongoose = require('mongoose');
const User = require('../modules/core/models/User');
const Organization = require('../modules/core/models/Organization');
const connectDB = require('../config/db');
require('dotenv').config({ path: '../../.env' });

const API_URL = 'http://localhost:5000/api/auth';
const TEST_USER = {
    name: 'MFA Tester',
    email: 'mfa@test.com',
    password: 'password123',
    organizationName: 'MFA Corp'
};

const testMFA = async () => {
    try {
        console.log('--- Database Cleanup ---');
        await connectDB();
        await User.deleteOne({ email: TEST_USER.email });
        await Organization.deleteOne({ name: TEST_USER.organizationName });

        console.log('\n--- 1. Register ---');
        const regRes = await axios.post(`${API_URL}/register`, TEST_USER);
        const token = regRes.data.token;
        console.log('Registered. Token:', !!token);

        console.log('\n--- 2. Enable MFA ---');
        const enableRes = await axios.post(`${API_URL}/mfa/enable`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const secretBase32 = enableRes.data.secret;
        console.log('MFA Secret Received:', secretBase32);
        console.log('QR Code URL:', !!enableRes.data.qrCode);

        console.log('\n--- 3. Verify MFA ---');
        // Generate valid token
        const userToken = speakeasy.totp({
            secret: secretBase32,
            encoding: 'base32'
        });

        const verifyRes = await axios.post(`${API_URL}/mfa/verify`, {
            token: userToken
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('MFA Verified:', verifyRes.data.success);

        console.log('\n--- 4. Login without Token (Should fail/ask for token) ---');
        const loginNoMfa = await axios.post(`${API_URL}/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        // We expect { success: false, mfaRequired: true } but axios throws on 4xx/5xx usually.
        // But our controller returns 200 { success: false, mfaRequired: true } for this case?
        // Let's check controller code: `res.status(200).json(...)` if !token. Yes.
        console.log('Login Response:', loginNoMfa.data);
        if (loginNoMfa.data.mfaRequired) {
            console.log('SUCCESS: Server requested MFA token.');
        } else {
            console.log('FAIL: Server did not request MFA.');
        }

        console.log('\n--- 5. Login with Token ---');
        const newToken = speakeasy.totp({
            secret: secretBase32,
            encoding: 'base32'
        });

        const loginMfa = await axios.post(`${API_URL}/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password,
            token: newToken
        });
        console.log('Login with MFA success:', !!loginMfa.data.token);

        // CLEANUP
        console.log('\n--- Cleanup ---');
        await User.deleteOne({ email: TEST_USER.email });
        await Organization.deleteOne({ name: TEST_USER.organizationName });

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
    }
};

testMFA();
