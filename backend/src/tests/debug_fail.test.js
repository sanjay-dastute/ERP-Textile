const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../modules/core/models/User');
const Product = require('../modules/sales/models/Product');
const Vendor = require('../modules/purchase/models/Vendor');
const fs = require('fs');

let token;
let user;
let product;
let vendor1;

beforeEach(async () => {
    user = await User.create({
        name: 'Procurement Officer',
        email: 'procurement@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    product = await Product.create({
        name: 'Cotton Yarn 40s',
        sku: 'YARN-' + Date.now(),
        organization: user.organization
    });

    vendor1 = await Vendor.create({
        name: 'Supplier A',
        code: 'SUP-A',
        products: [{ product: product._id, moq: 1 }],
        ratings: { quality: 5, delivery: 5, cost: 5, overall: 5 },
        organization: user.organization
    });
});

test('Debug Create PO Failure', async () => {
    const res = await request(app)
        .post('/api/purchase/purchase-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
            vendor: vendor1._id,
            items: [{
                product: product._id,
                description: 'Cotton Yarn',
                quantity: 100,
                unitPrice: 95,
                total: 9500
            }],
            totalAmount: 9500,
            expectedDeliveryDate: new Date()
        });

    if (res.statusCode !== 201) {
        fs.writeFileSync('debug_fail_error.json', JSON.stringify(res.body, null, 2));
    }
    expect(res.statusCode).toBe(201);
});
