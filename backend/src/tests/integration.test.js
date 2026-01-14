const request = require('supertest');
const app = require('../app');
const User = require('../modules/core/models/User');
const Organization = require('../modules/core/models/Organization');
const Quotation = require('../modules/sales/models/Quotation');

describe('Integration: Tenant Onboarding & Sales Cycle', () => {
    // Tenant A Data
    const tenantA_Admin = {
        name: 'Admin A',
        email: 'admin.a@test.com',
        password: 'password123',
        organizationName: 'Tenant A Corp',
        contactEmail: 'contact@tenant-a.com'
    };

    const tenantA_Manager = {
        name: 'Manager A',
        email: 'manager.a@test.com',
        password: 'password123'
    };

    // Tenant B Data
    const tenantB_Admin = {
        name: 'Admin B',
        email: 'admin.b@test.com',
        password: 'password123',
        organizationName: 'Tenant B Inc',
        contactEmail: 'contact@tenant-b.com'
    };

    let tokenA_Admin;
    let tokenA_Manager;
    let tokenB_Admin;
    let orgA_Id;
    let quoteA_Id;

    it('should execute full tenant onboarding and sales cycle', async () => {
        // Step 1: Onboard Tenant A (Register Admin)
        const res = await request(app).post('/api/auth/register').send(tenantA_Admin);
        expect(res.statusCode).toEqual(200);
        expect(res.body.token).toBeDefined();
        tokenA_Admin = res.body.token;
        orgA_Id = res.body.user.organization;

        const org = await Organization.findById(orgA_Id);
        expect(org.name).toBe(tenantA_Admin.organizationName);

        // Step 2: Configure Tenant A Settings
        const configRes = await request(app)
            .put('/api/organization/settings')
            .set('Authorization', `Bearer ${tokenA_Admin}`)
            .send({
                localization: {
                    currency: 'EUR',
                    timezone: 'Europe/Berlin'
                },
                branding: {
                    primaryColor: '#FF0000'
                }
            });

        expect(configRes.statusCode).toEqual(200);
        expect(configRes.body.data.localization.currency).toBe('EUR');

        // Step 3: Admin A creates Sales Manager user
        // Using direct DB creation as discussed, but role fixed to 'manager'
        await User.create({
            ...tenantA_Manager,
            organization: orgA_Id,
            role: 'manager'
        });

        const loginRes = await request(app).post('/api/auth/login').send({
            email: tenantA_Manager.email,
            password: tenantA_Manager.password
        });

        expect(loginRes.statusCode).toEqual(200);
        tokenA_Manager = loginRes.body.token;

        // Step 4: Manager A creates a Quotation
        const quoteData = {
            customer: { name: 'Client A' },
            items: [{ description: 'Item 1', quantity: 10, unitPrice: 50 }],
            validUntil: new Date()
        };

        const quoteRes = await request(app)
            .post('/api/sales/quotations')
            .set('Authorization', `Bearer ${tokenA_Manager}`)
            .send(quoteData);

        expect(quoteRes.statusCode).toEqual(201);
        expect(quoteRes.body.data.totalAmount).toBe(500);
        quoteA_Id = quoteRes.body.data._id;

        // Step 5: Onboard Tenant B and attempting to access Tenant A data
        const resB = await request(app).post('/api/auth/register').send(tenantB_Admin);
        tokenB_Admin = resB.body.token;

        const failRes = await request(app)
            .get(`/api/sales/quotations/${quoteA_Id}`)
            .set('Authorization', `Bearer ${tokenB_Admin}`);

        expect(failRes.statusCode).toEqual(404);

        // Step 6: Manager A can still see their Quotation
        const getRes = await request(app)
            .get(`/api/sales/quotations/${quoteA_Id}`)
            .set('Authorization', `Bearer ${tokenA_Manager}`);

        expect(getRes.statusCode).toEqual(200);
        expect(getRes.body.data._id).toBe(quoteA_Id);
    });
});
