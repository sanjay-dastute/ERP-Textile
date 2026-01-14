const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const Invoice = require('../modules/sales/models/Invoice');
const User = require('../modules/core/models/User');

let token;
let customerId;

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Finance User',
        email: 'finance@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customer
    const customer = await Customer.create({
        name: 'Late Payer',
        email: 'billing@late.com',
        organization: user.organization
    });
    customerId = customer._id;
});

describe('AR Aging Endpoints', () => {

    it('should create an invoice', async () => {
        const res = await request(app)
            .post('/api/sales/invoices')
            .set('Authorization', `Bearer ${token}`)
            .send({
                customer: customerId,
                dueDate: new Date(Date.now() + 86400000), // Tomorrow
                totalAmount: 1000
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.customer).toBe(customerId.toString());
        expect(res.body.data.status).toBe('Unpaid');
    });

    it('should calculate AR aging correctly', async () => {
        const orgId = (await User.findOne({ email: 'finance@example.com' })).organization;

        // Use direct DB insertion to force backdated dueDates
        const now = new Date();
        const day = 24 * 60 * 60 * 1000;

        await Invoice.create([
            {
                invoiceNumber: 'INV001', customer: customerId, totalAmount: 100,
                dueDate: new Date(now.getTime() - 10 * day), // 10 days overdue -> 30 bucket
                status: 'Overdue', organization: orgId
            },
            {
                invoiceNumber: 'INV002', customer: customerId, totalAmount: 200,
                dueDate: new Date(now.getTime() - 40 * day), // 40 days overdue -> 60 bucket
                status: 'Overdue', organization: orgId
            },
            {
                invoiceNumber: 'INV003', customer: customerId, totalAmount: 300,
                dueDate: new Date(now.getTime() + 10 * day), // Future -> Current
                status: 'Unpaid', organization: orgId
            }
        ]);

        const res = await request(app)
            .get('/api/sales/reports/ar-aging')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        const report = res.body.data['Late Payer'];

        expect(report).toBeDefined();
        expect(report.total).toBe(600);
        expect(report.current).toBe(300);
        expect(report.days30).toBe(100);
        expect(report.days60).toBe(200);
    });
});
