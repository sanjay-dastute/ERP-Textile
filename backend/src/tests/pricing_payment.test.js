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
let vendorTiers;

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

    // Create Vendor with Tiers and Payment Terms to test BOTH
    vendorTiers = await Vendor.create({
        name: 'Wholesaler Tier',
        code: 'WHOLE-T',
        paymentTerms: {
            discountPercent: 2,
            discountDays: 10,
            netDays: 30
        },
        products: [{
            product: product._id,
            moq: 1,
            pricingTiers: [
                { minQuantity: 10, price: 10 },    // Standard
                { minQuantity: 100, price: 8 },    // Bulk Discount
                { minQuantity: 500, price: 5 }     // Super Bulk
            ]
        }],
        organization: user.organization
    });
});

describe('Pricing & Payment Terms', () => {

    it('should apply correct tier pricing based on quantity', async () => {
        // TIER 1: Qty 50 -> Price 10
        const res1 = await request(app)
            .post('/api/purchase/purchase-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendorTiers._id,
                items: [{ product: product._id, quantity: 50 }],
                totalAmount: 0 // Will auto-calc
            });

        expect(res1.statusCode).toBe(201);
        expect(res1.body.data.items[0].unitPrice).toBe(10);
        expect(res1.body.data.totalAmount).toBe(500);

        // TIER 2: Qty 150 -> Price 8
        const res2 = await request(app)
            .post('/api/purchase/purchase-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendorTiers._id,
                items: [{ product: product._id, quantity: 150 }],
                totalAmount: 0
            });

        expect(res2.statusCode).toBe(201);
        expect(res2.body.data.items[0].unitPrice).toBe(8);
        expect(res2.body.data.totalAmount).toBe(1200); // 150 * 8
    });

    it('should inherit payment terms from vendor', async () => {
        const res = await request(app)
            .post('/api/purchase/purchase-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendorTiers._id,
                items: [{ product: product._id, quantity: 10 }],
                totalAmount: 100
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.paymentTerms).toBeDefined();
        expect(res.body.data.paymentTerms.discountPercent).toBe(2);
        expect(res.body.data.paymentTerms.netDays).toBe(30);
    });
});
