const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const Activity = require('../modules/sales/models/Activity');
const User = require('../modules/core/models/User');

let token;
let customerId;

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Activity User',
        email: 'activity@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customer
    const customer = await Customer.create({
        name: 'Activity Client',
        email: 'client@activity.com',
        organization: user.organization
    });
    customerId = customer._id;
});

describe('Activity Tracking Endpoints', () => {

    it('should perform full CRUD lifecycle for an activity', async () => {
        // 1. CREATE
        const createRes = await request(app)
            .post(`/api/sales/customers/${customerId}/activities`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                subject: 'Initial Meeting',
                type: 'Meeting',
                dueDate: new Date(),
                description: 'Discuss requirements'
            });

        expect(createRes.statusCode).toBe(201);
        expect(createRes.body.data.subject).toBe('Initial Meeting');
        const activityId = createRes.body.data._id;

        // 2. READ
        const readRes = await request(app)
            .get(`/api/sales/customers/${customerId}/activities`)
            .set('Authorization', `Bearer ${token}`);

        expect(readRes.statusCode).toBe(200);
        expect(readRes.body.count).toBeGreaterThanOrEqual(1);
        expect(readRes.body.data[0]._id).toBe(activityId);

        // 3. UPDATE
        const updateRes = await request(app)
            .put(`/api/sales/activities/${activityId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                status: 'In Progress',
                description: 'Meeting currently happening'
            });

        expect(updateRes.statusCode).toBe(200);
        expect(updateRes.body.data.status).toBe('In Progress');

        // 4. DELETE
        const deleteRes = await request(app)
            .delete(`/api/sales/activities/${activityId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.statusCode).toBe(200);

        // Verify deletion
        const check = await Activity.findById(activityId);
        expect(check).toBeNull();
    });

});
