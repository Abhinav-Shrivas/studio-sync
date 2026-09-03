'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = require('../../index');
const { sequelize } = require('../../models');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const { generateToken } = require('../../utils/jwt');

// Seeded accounts
const STAFF_EMAIL = 'staff@studio.com';
const INSTRUCTOR_EMAIL = 'priya@studio.com';
const DEACTIVATED_EMAIL = 'vikram@studio.com';
const VALID_PASSWORD = 'password123';

describe('Authentication & Authorization', () => {
  let staffToken;
  let instructorToken;
  let testApp;

  const cleanupTestData = async () => {
    await sequelize.query('DELETE FROM "session_co_instructors" WHERE "session_id" > 20');
    await sequelize.query('DELETE FROM "bookings" WHERE "id" > 35');
    await sequelize.query('DELETE FROM "sessions" WHERE "id" > 20');
    await sequelize.query('DELETE FROM "classes" WHERE "id" > 7');
  };

  beforeAll(async () => {
    await cleanupTestData();

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

    const staffRes = await request(app)
      .post('/auth/login')
      .send({ email: STAFF_EMAIL, password: VALID_PASSWORD });
    staffToken = staffRes.body.data.token;

    const instRes = await request(app)
      .post('/auth/login')
      .send({ email: INSTRUCTOR_EMAIL, password: VALID_PASSWORD });
    instructorToken = instRes.body.data.token;
  });

  afterAll(async () => {
    await cleanupTestData();
    await sequelize.close();
  });

  // 1. Valid login returns JWT and user data
  it('should return 200, JWT, and user info without password_hash on valid login', async () => {
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
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  // 2. Wrong password returns 401
  it('should return 401 on wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: STAFF_EMAIL, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 3. Unknown email returns 401
  it('should return 401 on unknown email without leaking account existence', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: VALID_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 4. Deactivated account returns 401
  it('should return 401 on deactivated account', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: DEACTIVATED_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 5. Protected route without valid authentication returns 401
  it('should return 401 on protected route without valid authentication', async () => {
    const resMissing = await request(testApp).get('/test/protected');
    expect(resMissing.status).toBe(401);
    expect(resMissing.body.success).toBe(false);

    const resInvalid = await request(testApp)
      .get('/test/protected')
      .set('Authorization', 'Bearer invalid.token.value');
    expect(resInvalid.status).toBe(401);
    expect(resInvalid.body.success).toBe(false);
  });

  // 6. Valid JWT allows access and populates req.user
  it('should allow access and populate req.user for a valid JWT', async () => {
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

  // 7. Role authorization correctly allows/denies STAFF and INSTRUCTOR
  it('should correctly allow/deny STAFF and INSTRUCTOR based on role authorization', async () => {
    // STAFF -> staff-only route: 200
    const staffAllowed = await request(testApp)
      .get('/test/staff-only')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffAllowed.status).toBe(200);

    // INSTRUCTOR -> staff-only route: 403
    const instructorDenied = await request(testApp)
      .get('/test/staff-only')
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(instructorDenied.status).toBe(403);
    expect(instructorDenied.body.message).toMatch(/insufficient permissions/i);

    // INSTRUCTOR -> instructor-only route: 200
    const instructorAllowed = await request(testApp)
      .get('/test/instructor-only')
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(instructorAllowed.status).toBe(200);

    // STAFF -> instructor-only route: 403
    const staffDenied = await request(testApp)
      .get('/test/instructor-only')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffDenied.status).toBe(403);
  });

});
