const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const Complaint = require('../modules/sales/models/Complaint');
const User = require('../modules/core/models/User');

let token;
let customerId;
let complaintId;

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Support User',
        email: 'support@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customer
    const customer = await Customer.create({
        name: 'Unhappy Client',
        email: 'sad@client.com',
        organization: user.organization
    });
    customerId = customer._id;
});

describe('Complaint Tracking Endpoints', () => {

    it('should create a complaint for a customer', async () => {
        const res = await request(app)
            .post(`/api/sales/customers/${customerId}/complaints`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                subject: 'Late Delivery',
                description: 'Order is 2 days late',
                priority: 'High',
                type: 'Delivery'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.subject).toBe('Late Delivery');
        expect(res.body.data.status).toBe('New');
        expect(res.body.data.customer).toBe(customerId.toString());
        complaintId = res.body.data._id;
    });

    it('should return 404 for invalid customer', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post(`/api/sales/customers/${fakeId}/complaints`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                subject: 'Test',
                description: 'Test'
            });

        expect(res.statusCode).toBe(404);
    });

    it('should get complaints for a customer', async () => {
        // Setup: Create complaint
        await request(app)
            .post(`/api/sales/customers/${customerId}/complaints`)
            .set('Authorization', `Bearer ${token}`)
            .send({ subject: 'Issue 1', description: 'Desc' });

        const res = await request(app)
            .get(`/api/sales/customers/${customerId}/complaints`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.count).toBe(1);
        expect(res.body.data[0].subject).toBe('Issue 1');
    });

    it('should update a complaint status', async () => {
        // Setup: Create complaint
        const createRes = await request(app)
            .post(`/api/sales/customers/${customerId}/complaints`)
            .set('Authorization', `Bearer ${token}`)
            .send({ subject: 'To Resolve', description: 'Fix me' });

        complaintId = createRes.body.data._id;

        const res = await request(app)
            .put(`/api/sales/complaints/${complaintId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                status: 'Resolved',
                resolution: 'Refund processed'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('Resolved');
        expect(res.body.data.resolution).toBe('Refund processed');
        expect(res.body.data.resolvedBy).toBeDefined();
        expect(res.body.data.resolvedAt).toBeDefined();
    });

    it('should delete a complaint', async () => {
        // Setup: Create complaint
        const createRes = await request(app)
            .post(`/api/sales/customers/${customerId}/complaints`)
            .set('Authorization', `Bearer ${token}`)
            .send({ subject: 'To Delete', description: 'Delete me' });

        complaintId = createRes.body.data._id;

        const res = await request(app)
            .delete(`/api/sales/complaints/${complaintId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);

        const dbCheck = await Complaint.findById(complaintId);
        expect(dbCheck).toBeNull();
    });
});
