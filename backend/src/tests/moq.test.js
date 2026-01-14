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

let token;
let user;
let product;
let vendorMoq;

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

    // Create Product
    product = await Product.create({
        name: 'Bulk Item',
        sku: 'BULK-' + Date.now(),
        organization: user.organization
    });

    // Create Vendor with High MOQ
    vendorMoq = await Vendor.create({
        name: 'Wholesaler X',
        code: 'WHOLE-X',
        products: [{ product: product._id, moq: 100 }],
        organization: user.organization
    });
});

describe('MOQ Enforcement', () => {

    it('should reject PO with quantity below MOQ', async () => {
        const res = await request(app)
            .post('/api/purchase/purchase-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendorMoq._id,
                items: [{
                    product: product._id,
                    quantity: 50, // Below MOQ 100
                    unitPrice: 10,
                    total: 500
                }],
                totalAmount: 500
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/below MOQ/);
    });

    it('should accept PO with quantity equal to or above MOQ', async () => {
        const res = await request(app)
            .post('/api/purchase/purchase-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendorMoq._id,
                items: [{
                    product: product._id,
                    quantity: 100, // Meets MOQ 100
                    unitPrice: 10,
                    total: 1000
                }],
                totalAmount: 1000
            });

        expect(res.statusCode).toBe(201);
    });
});
