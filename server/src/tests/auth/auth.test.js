'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { sequelize } = require('../../models');

// ── Test data ────────────────────────────────────────────────────
// These match the seeded accounts (password: password123)
const STAFF_EMAIL = 'staff@studio.com';
const INSTRUCTOR_EMAIL = 'priya@studio.com';
const DEACTIVATED_EMAIL = 'vikram@studio.com';
const VALID_PASSWORD = 'password123';

describe('Authentication & Authorization', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  // ────────────────────────────────────────────────────────────────
  // LOGIN
  // ────────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('should return a JWT and user data for valid staff credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: STAFF_EMAIL, password: VALID_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        email: STAFF_EMAIL,
        role: 'STAFF',
      });
      // Must NOT expose password_hash
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should return a JWT with correct payload (userId and role)', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: INSTRUCTOR_EMAIL, password: VALID_PASSWORD });

      const decoded = jwt.verify(res.body.data.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(res.body.data.user.id);
      expect(decoded.role).toBe('INSTRUCTOR');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: STAFF_EMAIL, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for unknown email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: VALID_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 for deactivated account', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: DEACTIVATED_EMAIL, password: VALID_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: VALID_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: STAFF_EMAIL });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'not-an-email', password: VALID_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // AUTHENTICATION & AUTHORIZATION MIDDLEWARE (HTTP Integration)
  // ────────────────────────────────────────────────────────────────
  describe('Middleware HTTP Integration', () => {
    const express = require('express');
    const authenticate = require('../../middlewares/authenticate');
    const authorize = require('../../middlewares/authorize');

    let testApp;
    let staffToken;
    let instructorToken;

    beforeAll(async () => {
      testApp = express();
      testApp.use(express.json());

      testApp.get('/test/protected', authenticate, (req, res) => {
        res.json({ success: true, user: req.user });
      });

      testApp.get('/test/staff-only', authenticate, authorize('STAFF'), (req, res) => {
        res.json({ success: true, user: req.user });
      });

      testApp.get('/test/instructor-only', authenticate, authorize('INSTRUCTOR'), (req, res) => {
        res.json({ success: true, user: req.user });
      });

      // Login staff
      const staffRes = await request(app)
        .post('/auth/login')
        .send({ email: STAFF_EMAIL, password: VALID_PASSWORD });
      staffToken = staffRes.body.data.token;

      // Login instructor
      const instructorRes = await request(app)
        .post('/auth/login')
        .send({ email: INSTRUCTOR_EMAIL, password: VALID_PASSWORD });
      instructorToken = instructorRes.body.data.token;
    });

    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(testApp).get('/test/protected');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication required');
    });

    it('should return 401 for malformed Authorization header', async () => {
      const res = await request(testApp)
        .get('/test/protected')
        .set('Authorization', 'Basic invalidformat');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication required');
    });

    it('should return 401 for an invalid token', async () => {
      const res = await request(testApp)
        .get('/test/protected')
        .set('Authorization', 'Bearer invalid.token.signature');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid token');
    });

    it('should allow access and populate req.user for valid token', async () => {
      const res = await request(testApp)
        .get('/test/protected')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({
        id: expect.any(Number),
        role: 'STAFF',
      });
    });

    it('should allow STAFF to access staff-only route', async () => {
      const res = await request(testApp)
        .get('/test/staff-only')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 when INSTRUCTOR accesses staff-only route', async () => {
      const res = await request(testApp)
        .get('/test/staff-only')
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Insufficient permissions');
    });

    it('should allow INSTRUCTOR to access instructor-only route', async () => {
      const res = await request(testApp)
        .get('/test/instructor-only')
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 when STAFF accesses instructor-only route', async () => {
      const res = await request(testApp)
        .get('/test/instructor-only')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Insufficient permissions');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // JWT EXPIRATION
  // ────────────────────────────────────────────────────────────────
  describe('JWT Expiration', () => {
    const { generateToken } = require('../../utils/jwt');

    it('should generate a token with an expiration of approximately 1 day (24 hours)', () => {
      const token = generateToken({ userId: 1, role: 'STAFF' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const oneDayInSeconds = 24 * 60 * 60; // 86400 seconds
      const tokenDuration = decoded.exp - decoded.iat;

      // Expect expiration to be roughly 24 hours after issued-at, allowing execution tolerance
      expect(Math.abs(tokenDuration - oneDayInSeconds)).toBeLessThanOrEqual(5);
    });
  });
});

