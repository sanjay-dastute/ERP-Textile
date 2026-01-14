const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const Invoice = require('../modules/sales/models/Invoice');
const User = require('../modules/core/models/User');

let token;
let customer1, customer2;

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Finance Manager',
        email: 'finance@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customers
    customer1 = await Customer.create({ name: 'High Spender', organization: user.organization });
    customer2 = await Customer.create({ name: 'Low Spender', organization: user.organization });

    // Create Invoices based on Paid Amount (CLV logic depends on paidAmount, not totalAmount)
    await Invoice.create([
        {
            invoiceNumber: 'INV-1', customer: customer1._id, organization: user.organization,
            totalAmount: 1000, paidAmount: 1000, dueDate: new Date()
        },
        {
            invoiceNumber: 'INV-2', customer: customer1._id, organization: user.organization,
            totalAmount: 2000, paidAmount: 1500, dueDate: new Date() // Partial pay
        },
        {
            invoiceNumber: 'INV-3', customer: customer2._id, organization: user.organization,
            totalAmount: 500, paidAmount: 500, dueDate: new Date()
        }
    ]);
});

describe('CLV Reporting Endpoints', () => {

    it('should calculate and sort CLV correctly', async () => {
        const res = await request(app)
            .get('/api/sales/reports/clv')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        const report = res.body.data;

        expect(report.length).toBe(2);

        // High Spender: 1000 + 1500 = 2500
        expect(report[0].customerName).toBe('High Spender');
        expect(report[0].totalSpent).toBe(2500);
        expect(report[0].invoiceCount).toBe(2);

        // Low Spender: 500
        expect(report[1].customerName).toBe('Low Spender');
        expect(report[1].totalSpent).toBe(500);
    });
});
