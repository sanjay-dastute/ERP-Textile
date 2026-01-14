const request = require('supertest');
const app = require('../app');
const User = require('../modules/core/models/User');
const Organization = require('../modules/core/models/Organization');

describe('Auth Endpoints', () => {
    let adminToken;

    const testUser = {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        organizationName: 'Test Org',
        contactEmail: 'contact@test.com'
    };

    it('should register a new user and organization', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('name', testUser.name);

        // Verify DB
        const user = await User.findOne({ email: testUser.email });
        expect(user).toBeTruthy();
        expect(user.role).toBe('admin');
    });

    it('should login an existing user', async () => {
        // Register first (since beforeEach clears DB)
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
    });

    it('should get current user profile', async () => {
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        const token = regRes.body.token;

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.email).toEqual(testUser.email);
    });
});
