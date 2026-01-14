const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const NPSResponse = require('../modules/sales/models/NPSResponse');
const User = require('../modules/core/models/User');

let token;
let customerId;

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Survey Admin',
        email: 'survey@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customer
    const customer = await Customer.create({
        name: 'Survey Respondent',
        email: 'respondent@example.com',
        organization: user.organization
    });
    customerId = customer._id;
});

describe('NPS Tracking Endpoints', () => {

    it('should submit an NPS response', async () => {
        const res = await request(app)
            .post(`/api/sales/customers/${customerId}/nps`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                score: 9,
                feedback: 'Great service!'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.score).toBe(9);
        expect(res.body.data.customer).toBe(customerId.toString());
    });

    it('should validate NPS score range', async () => {
        const res = await request(app)
            .post(`/api/sales/customers/${customerId}/nps`)
            .set('Authorization', `Bearer ${token}`)
            .send({ score: 11 }); // Invalid

        expect(res.statusCode).toBe(400);
    });

    it('should calculate NPS score correctly', async () => {
        const orgId = (await User.findOne({ email: 'survey@example.com' })).organization;

        // Insert responses manually to simulate different scores
        await NPSResponse.create([
            { customer: customerId, score: 10, organization: orgId }, // Promoter
            { customer: customerId, score: 9, organization: orgId },  // Promoter
            { customer: customerId, score: 8, organization: orgId },  // Passive
            { customer: customerId, score: 6, organization: orgId }   // Detractor
        ]);
        // Total: 4. Promoters: 2 (50%). Passives: 1 (25%). Detractors: 1 (25%).
        // NPS = 50 - 25 = 25.

        const res = await request(app)
            .get('/api/sales/reports/nps')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.total).toBe(4);
        expect(res.body.data.promoters).toBe(2);
        expect(res.body.data.detractors).toBe(1);
        expect(res.body.data.nps).toBe(25);
    });
});
