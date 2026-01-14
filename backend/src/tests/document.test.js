const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Customer = require('../modules/sales/models/Customer');
const Document = require('../modules/sales/models/Document');
const User = require('../modules/core/models/User');
const fs = require('fs-extra');
const path = require('path');

let token;
let customerId;
let docId;
const testFilePath = path.join(__dirname, 'testfile.txt');

beforeEach(async () => {
    // Create User & Token
    const user = await User.create({
        name: 'Doc User',
        email: 'doc@example.com',
        password: 'password123',
        role: 'admin',
        organization: new mongoose.Types.ObjectId()
    });
    token = user.getSignedJwtToken();

    // Create Customer
    const customer = await Customer.create({
        name: 'Doc Client',
        email: 'client@doc.com',
        organization: user.organization
    });
    customerId = customer._id;

    // Create dummy test file
    await fs.writeFile(testFilePath, 'This is a test document.');
});

afterEach(async () => {
    // Cleanup chunks handled by global setup, but explicit file cleanup is good practice
    if (await fs.pathExists(testFilePath)) {
        await fs.unlink(testFilePath);
    }
    // Clean uploads directory
    const uploadsDir = path.join(__dirname, '../../uploads'); // Adjust relative path if needed
    if (await fs.pathExists(uploadsDir)) {
        await fs.emptyDir(uploadsDir);
    }
});


describe('Document Storage Endpoints', () => {

    it('should upload a document', async () => {
        const res = await request(app)
            .post(`/api/sales/customers/${customerId}/documents`)
            .set('Authorization', `Bearer ${token}`)
            .attach('file', testFilePath)
            .field('tags', JSON.stringify(['contract', '2025']));

        expect(res.statusCode).toBe(201);
        expect(res.body.data.originalName).toBe('testfile.txt');
        expect(res.body.data.customer).toBe(customerId.toString());
        docId = res.body.data._id;

        // Verify disk existence
        const fileExists = await fs.pathExists(res.body.data.path);
        expect(fileExists).toBe(true);
    });

    it('should get documents for a customer', async () => {
        // Setup: Create doc first
        const uploadRes = await request(app)
            .post(`/api/sales/customers/${customerId}/documents`)
            .set('Authorization', `Bearer ${token}`)
            .attach('file', testFilePath);

        docId = uploadRes.body.data._id;

        const res = await request(app)
            .get(`/api/sales/customers/${customerId}/documents`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.count).toBe(1);
        expect(res.body.data[0]._id).toBe(docId);
    });

    it('should delete a document', async () => {
        // Setup: Create doc first
        const uploadRes = await request(app)
            .post(`/api/sales/customers/${customerId}/documents`)
            .set('Authorization', `Bearer ${token}`)
            .attach('file', testFilePath);

        docId = uploadRes.body.data._id;
        const filePath = uploadRes.body.data.path;

        const res = await request(app)
            .delete(`/api/sales/documents/${docId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);

        // Verify DB deletion
        const dbCheck = await Document.findById(docId);
        expect(dbCheck).toBeNull();

        // Verify Disk deletion
        const fileCheck = await fs.pathExists(filePath);
        expect(fileCheck).toBe(false);
    });
});
