const mongoose = require('mongoose');
const User = require('../modules/core/models/User');
const Organization = require('../modules/core/models/Organization');
const connectDB = require('../config/db');
const { runInContext, setKey } = require('../utils/context');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const testRLS = async () => {
    try {
        console.log('Starting RLS Test...');
        console.log('MONGO_URI:', process.env.MONGO_URI);
        await connectDB();
        await new Promise(resolve => setTimeout(resolve, 1000)); // wait for connection

        console.log('--- Setup Data ---');
        // Create Orgs
        const org1 = await Organization.create({ name: 'RLS Org 1', contactEmail: 'org1@test.com' });
        const org2 = await Organization.create({ name: 'RLS Org 2', contactEmail: 'org2@test.com' });

        // Create Users (Ignore RLS for setup by not setting context yet, OR passing ignoreRLS option if we exposed it, 
        // but since we haven't set context, RLS plugin returns next() immediately, so we are safe).
        const user1 = await User.create({
            name: 'User 1', email: 'user1@org1.com', password: 'password123', organization: org1._id
        });
        const user2 = await User.create({
            name: 'User 2', email: 'user2@org2.com', password: 'password123', organization: org2._id
        });

        console.log('Created User 1 (Org 1) and User 2 (Org 2)');

        // Test 1: No Context (Should see all)
        // NOTE: My plugin logic says "if (!currentUser) return next()", so we see all.
        const allUsers = await User.find({});
        console.log(`No Context Query Count: ${allUsers.length} (Expected: >= 2)`);

        // Test 2: User 1 Context
        await runInContext(async () => {
            setKey('user', user1);
            setKey('organization', user1.organization); // ObjectId

            console.log('\n--- Switching to User 1 Context ---');
            const visibleUsers = await User.find({});
            console.log(`User 1 Context Query Count: ${visibleUsers.length}`);
            if (visibleUsers.length === 1 && visibleUsers[0].email === 'user1@org1.com') {
                console.log('PASS: Only User 1 visible');
            } else {
                console.log('FAIL: Visibility leaked or empty');
                visibleUsers.forEach(u => console.log(` - ${u.email} (${u.organization})`));
            }
        });

        // Test 3: User 2 Context
        await runInContext(async () => {
            setKey('user', user2);
            setKey('organization', user2.organization);

            console.log('\n--- Switching to User 2 Context ---');
            const visibleUsers = await User.find({});
            console.log(`User 2 Context Query Count: ${visibleUsers.length}`);
            if (visibleUsers.length === 1 && visibleUsers[0].email === 'user2@org2.com') {
                console.log('PASS: Only User 2 visible');
            } else {
                console.log('FAIL: Visibility leaked or empty');
            }
        });

        // Cleanup
        await User.deleteMany({ email: { $in: ['user1@org1.com', 'user2@org2.com'] } });
        await Organization.deleteMany({ _id: { $in: [org1._id, org2._id] } });
        console.log('\nCleanup Done');
        process.exit(0);

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
};

testRLS();
