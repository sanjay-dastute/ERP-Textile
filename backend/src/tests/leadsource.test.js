const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const User = require('../modules/core/models/User');

let token;

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Marketing Manager',
        email: 'marketing@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customers with various lead sources
    await Customer.create([
        { name: 'C1', leadSource: 'Web', organization: user.organization },
        { name: 'C2', leadSource: 'Web', organization: user.organization },
        { name: 'C3', leadSource: 'Referral', organization: user.organization },
        { name: 'C4', leadSource: 'Event', organization: user.organization },
        // Default is Other, verify handled correctly
        { name: 'C5', organization: user.organization }
    ]);
});

describe('Lead Source Tracking Endpoints', () => {

    it('should aggregate lead sources correctly', async () => {
        const res = await request(app)
            .get('/api/sales/reports/lead-sources')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        const report = res.body.data;

        expect(report['Web']).toBe(2);
        expect(report['Referral']).toBe(1);
        expect(report['Event']).toBe(1);
        expect(report['Other']).toBe(1); // C5 default
        expect(report['Cold Call']).toBe(0);
    });
});
