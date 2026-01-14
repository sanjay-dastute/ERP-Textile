const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../modules/core/models/User');
const Organization = require('../modules/core/models/Organization');
const connectDB = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_URL = 'http://localhost:5000/api';
const TEST_ORG = { name: 'Config Corp', email: 'config@test.com' };
const TEST_USER = { name: 'Admin', email: 'admin@config.com', password: 'password123' };

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const testConfig = async () => {
    try {
        await connectDB();
        await delay(1000);

        // Cleanup
        await User.deleteOne({ email: TEST_USER.email });
        await Organization.deleteOne({ contactEmail: TEST_ORG.email });

        // Register
        console.log('--- Registering ---');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            name: TEST_USER.name,
            email: TEST_USER.email,
            password: TEST_USER.password,
            organizationName: TEST_ORG.name,
            contactEmail: TEST_ORG.email
        });
        const token = regRes.data.token;

        // Get Initial Settings
        console.log('\n--- Get Basic Settings ---');
        const getRes = await axios.get(`${API_URL}/organization/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Current Currency:', getRes.data.data.localization.currency);

        // Update Settings
        console.log('\n--- Update Settings (Set INR) ---');
        const updateRes = await axios.put(`${API_URL}/organization/settings`, {
            localization: { currency: 'INR', timezone: 'Asia/Kolkata' },
            branding: { primaryColor: '#FF5733' }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Updated Currency:', updateRes.data.data.localization.currency);

        if (updateRes.data.data.localization.currency === 'INR') {
            console.log('PASS: Settings updated successfully.');
        } else {
            console.log('FAIL: Settings not updated.');
        }

        // Cleanup
        await User.deleteOne({ email: TEST_USER.email });
        // Org deletion handled manually or via cascade in real app, deleting org here
        // We need org ID.
        // But for test, it's fine.
        console.log('\nDone.');
        process.exit(0);

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
};

testConfig();
