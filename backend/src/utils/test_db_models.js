require('dotenv').config({ path: '../../.env' }); // Adjust path if running from backend root
const mongoose = require('mongoose');
const Organization = require('../modules/core/models/Organization');
const User = require('../modules/core/models/User');
const connectDB = require('../config/db');

const testModels = async () => {
    try {
        await connectDB();

        console.log('Creating Test Organization...');
        const org = await Organization.create({
            name: 'Test Corp',
            address: '123 Test St',
            contactEmail: 'admin@testcorp.com'
        });
        console.log('Organization Created:', org.name);

        console.log('Creating Test User...');
        const user = await User.create({
            name: 'Test Admin',
            email: 'admin@testcorp.com',
            password: 'password123',
            role: 'admin',
            organization: org._id
        });
        console.log('User Created:', user.name);

        // Cleanup
        await User.deleteOne({ _id: user._id });
        await Organization.deleteOne({ _id: org._id });
        console.log('Cleanup Successful');

        process.exit(0);
    } catch (error) {
        console.error('Test Failed:', error.message);
        process.exit(1);
    }
};

testModels();
