require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const User = require('../modules/core/models/User');
const Organization = require('../modules/core/models/Organization');
const connectDB = require('../config/db');
// const request = require('supertest'); // Removed unused import
// Actually, let's stick to the previous pattern of verifying the LOGIC via direct model interactions first, 
// AND then suggesting a manual test or using a script that calls the API if it's running.
// Since the user asked to "Proceed", let's make a script that uses `axios` to hit the local server.

const axios = require('axios');

const testAuth = async () => {
    const API_URL = 'http://localhost:5000/api/auth';

    try {
        // 1. Register
        console.log('Testing Registration...');
        const regRes = await axios.post(`${API_URL}/register`, {
            name: 'Test Admin',
            email: 'admin@testauth.com',
            password: 'password123',
            organizationName: 'Test Auth Corp',
            address: '456 Secure St'
        });
        console.log('Registration Success:', regRes.data.success);
        const token = regRes.data.token;

        // 2. Get Me (Protected)
        console.log('Testing User Profile (Protected)...');
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Profile Access Success:', meRes.data.success);
        console.log('User Role:', meRes.data.data.role);

        // 3. Login
        console.log('Testing Login...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: 'admin@testauth.com',
            password: 'password123'
        });
        console.log('Login Success:', loginRes.data.success);

        // Cleanup (Connect to DB directly to delete)
        await connectDB();
        await User.deleteOne({ email: 'admin@testauth.com' });
        await Organization.deleteOne({ name: 'Test Auth Corp' });
        console.log('Cleanup Successful');

    } catch (error) {
        console.error('Auth Test Failed:', error.response ? error.response.data : error.message);
    }
};

testAuth();
