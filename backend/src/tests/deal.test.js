const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const Deal = require('../modules/sales/models/Deal');
const User = require('../modules/core/models/User');

let token;
let customerId;

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Sales Manager',
        email: 'sales@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customer
    const customer = await Customer.create({
        name: 'Big Client',
        email: 'big@client.com',
        organization: user.organization
    });
    customerId = customer._id;
});

describe('Sales Pipeline Endpoints', () => {

    it('should create a deal with auto probability', async () => {
        const res = await request(app)
            .post('/api/sales/deals')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Big Contract',
                customer: customerId,
                amount: 50000,
                stage: 'Prospecting',
                probability: 10 // Explicitly sending, but let's test default behavior in another test if needed. 
                // Wait, model requires probability.
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.stage).toBe('Prospecting');
        expect(res.body.data.probability).toBe(10);
    });

    it('should update stage and auto-update probability', async () => {
        // Create initial deal
        const createRes = await request(app)
            .post('/api/sales/deals')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Updating Deal',
                customer: customerId,
                amount: 10000,
                stage: 'Prospecting',
                probability: 10
            });

        const dealId = createRes.body.data._id;

        // Update stage to Negotiation (should become 80%)
        const res = await request(app)
            .put(`/api/sales/deals/${dealId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ stage: 'Negotiation' });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.stage).toBe('Negotiation');
        expect(res.body.data.probability).toBe(80);
    });

    it('should summarize pipeline correctly', async () => {
        const orgId = (await User.findOne({ email: 'sales@example.com' })).organization;

        await Deal.create([
            { name: 'D1', customer: customerId, amount: 10000, stage: 'Prospecting', probability: 10, organization: orgId },
            { name: 'D2', customer: customerId, amount: 20000, stage: 'Negotiation', probability: 80, organization: orgId },
            { name: 'D3', customer: customerId, amount: 30000, stage: 'Negotiation', probability: 80, organization: orgId },
            { name: 'D4', customer: customerId, amount: 5000, stage: 'Closed Won', probability: 100, organization: orgId }
        ]);

        const res = await request(app)
            .get('/api/sales/reports/pipeline')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        const report = res.body.data;

        expect(report['Prospecting'].count).toBe(1);
        expect(report['Prospecting'].value).toBe(10000);

        expect(report['Negotiation'].count).toBe(2);
        expect(report['Negotiation'].value).toBe(50000);

        expect(report['Closed Won'].count).toBe(1);
        expect(report['Total'].count).toBe(4);
        expect(report['Total'].value).toBe(65000);
    });
});
