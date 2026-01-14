/**
 * Copyright - Dastute Switcher Technologies 
 * Author - SANJAY KR, DHILISH
 */
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../modules/core/models/User');
const Product = require('../modules/sales/models/Product');
const Vendor = require('../modules/purchase/models/Vendor');
const PurchaseOrder = require('../modules/purchase/models/PurchaseOrder');

let token;
let user;
let product;
let vendor1;

beforeEach(async () => {
    // Create User & Token
    user = await User.create({
        name: 'Procurement Officer',
        email: 'procurement@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create a Product to buy
    product = await Product.create({
        name: 'Cotton Yarn 40s',
        sku: 'YARN-40', // Keep static if DB clears, or dynamic if preferred. Setup.js clears DB.
        description: 'High quality cotton yarn',
        organization: user.organization
    });

    // Create Vendor 1
    vendor1 = await Vendor.create({
        name: 'Supplier A',
        code: 'SUP-A',
        products: [{ product: product._id, moq: 1 }],
        ratings: { quality: 5, delivery: 5, cost: 5, overall: 5 },
        organization: user.organization
    });
});

describe('Purchase Module Endpoints', () => {

    it('should create a new vendor', async () => {
        const res = await request(app)
            .post('/api/purchase/vendors')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Supplier B',
                code: 'SUP-B',
                contactPerson: { name: 'John Doe', email: 'john@b.com' },
                products: [{ product: product._id, moq: 50 }],
                ratings: { quality: 8, delivery: 8, cost: 8 }, // Should auto-calc overall to 8
                organization: user.organization
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.name).toBe('Supplier B');
        expect(res.body.data.ratings.overall).toBe(8);
    });

    it('should create a purchase order', async () => {
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

        expect(res.statusCode).toBe(201);
        expect(res.body.data.poNumber).toBeDefined();
        expect(res.body.data.status).toBe('Draft');
    });

    it('should recommend vendors based on score', async () => {
        // Vendor 1 has score 5.
        // Create Vendor 2 with score 9.
        await Vendor.create({
            name: 'Supplier Top',
            code: 'SUP-TOP',
            products: [{ product: product._id, moq: 1 }],
            ratings: { quality: 9, delivery: 9, cost: 9, overall: 9 },
            organization: user.organization
        });

        const res = await request(app)
            .get(`/api/purchase/vendors/recommend/${product._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        // Expect Supplier Top to be first
        expect(res.body.data[0].name).toBe('Supplier Top');
        expect(res.body.data[1].name).toBe('Supplier A');
    });
});
