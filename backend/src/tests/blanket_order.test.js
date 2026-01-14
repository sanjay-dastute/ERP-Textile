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
const BlanketOrder = require('../modules/purchase/models/BlanketOrder');

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

    // Create a Product
    product = await Product.create({
        name: 'Cotton Yarn 40s',
        sku: 'YARN-' + Date.now(),
        description: 'Cotton Yarn',
        organization: user.organization
    });

    // Create Vendor
    vendor1 = await Vendor.create({
        name: 'Supplier A',
        code: 'SUP-A',
        products: [{ product: product._id, moq: 1 }],
        organization: user.organization
    });
});

describe('Blanket Order Management', () => {

    it('should create a blanket order and allow call-off PO', async () => {
        // 1. Create Blanket Order
        const validFrom = new Date();
        const validTo = new Date();
        validTo.setFullYear(validTo.getFullYear() + 1); // 1 year validity

        const boRes = await request(app)
            .post('/api/purchase/blanket-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendor1._id,
                validFrom,
                validTo,
                items: [{
                    product: product._id,
                    agreedPrice: 80, // Lower than market price
                    maxQuantity: 1000
                }]
            });

        expect(boRes.statusCode).toBe(201);
        const boId = boRes.body.data._id;
        expect(boRes.body.data.agreementNumber).toBeDefined();

        // 2. Create PO against Blanket Order (Call-off)
        const poRes = await request(app)
            .post('/api/purchase/purchase-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendor1._id,
                blanketOrder: boId,
                items: [{
                    product: product._id,
                    description: 'Call-off order',
                    quantity: 100,
                    unitPrice: 100, // Should be overridden by BO price (80)
                    total: 10000
                }],
                totalAmount: 10000,
                expectedDeliveryDate: new Date()
            });

        expect(poRes.statusCode).toBe(201);

        // Check Price Override
        const poItem = poRes.body.data.items[0];
        expect(poItem.unitPrice).toBe(80); // Should match BO agreed price
        expect(poItem.total).toBe(8000); // 100 * 80
        expect(poRes.body.data.totalAmount).toBe(8000);

        // Check BO Quantity Update
        const boUpdated = await BlanketOrder.findById(boId);
        expect(boUpdated.items[0].orderedQuantity).toBe(100);
    });

    it('should reject PO if blanket order quantity exceeded', async () => {
        // 1. Create Blanket Order with small limit
        const validTo = new Date();
        validTo.setFullYear(validTo.getFullYear() + 1);

        const bo = await BlanketOrder.create({
            agreementNumber: 'BO-LIMIT-TEST',
            vendor: vendor1._id,
            validFrom: new Date(),
            validTo,
            items: [{
                product: product._id,
                agreedPrice: 80,
                maxQuantity: 50
            }],
            organization: user.organization
        });

        // 2. Try to order more than limit
        const poRes = await request(app)
            .post('/api/purchase/purchase-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                vendor: vendor1._id,
                blanketOrder: bo._id,
                items: [{
                    product: product._id,
                    quantity: 60, // Exceeds 50
                    unitPrice: 80,
                    total: 4800
                }],
                totalAmount: 4800
            });

        expect(poRes.statusCode).toBe(400);
        expect(poRes.body.error).toMatch(/Quantity exceeds Blanket Order limit/);
    });
});
