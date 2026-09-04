'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { sequelize, Member, MemberAlertDismissal, User } = require('../../models');
const { getTodayDateString, addDaysToDateString } = require('../../services/member-alert.service');

const STAFF_EMAIL = 'staff@studio.com';
const INSTRUCTOR_EMAIL = 'priya@studio.com';
const PASSWORD = 'password123';

describe('Goal 10: Expiring Membership Alerts', () => {
  let staffToken;
  let staffUser;
  let instructorToken;
  let memberToken;

  let memberExpired;
  let memberExpiringSoon;
  let memberExpiresToday;
  let memberFarFuture;

  const todayStr = getTodayDateString();

  const cleanupTestData = async () => {
    await sequelize.query('DELETE FROM "member_alert_dismissals" WHERE "id" > 2');
    await sequelize.query('DELETE FROM "members" WHERE "id" > 15');
  };

  beforeAll(async () => {
    await cleanupTestData();

    // 1. Staff login
    const staffRes = await request(app)
      .post('/auth/login')
      .send({ email: STAFF_EMAIL, password: PASSWORD });
    staffToken = staffRes.body.data.token;
    staffUser = staffRes.body.data.user;

    // 2. Instructor login
    const instRes = await request(app)
      .post('/auth/login')
      .send({ email: INSTRUCTOR_EMAIL, password: PASSWORD });
    instructorToken = instRes.body.data.token;

    // 3. Member token simulation
    memberToken = jwt.sign(
      { id: 999, email: 'member@test.com', role: 'MEMBER' },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '1d' }
    );

    // 4. Create test members
    memberExpired = await Member.create({
      name: 'Alert Member Expired',
      email: `expired_${Date.now()}@test.com`,
      membership_expiry: addDaysToDateString(todayStr, -3),
    });

    memberExpiringSoon = await Member.create({
      name: 'Alert Member Expiring Soon',
      email: `expiring_soon_${Date.now()}@test.com`,
      membership_expiry: addDaysToDateString(todayStr, 4),
    });

    memberExpiresToday = await Member.create({
      name: 'Alert Member Expires Today',
      email: `expires_today_${Date.now()}@test.com`,
      membership_expiry: todayStr,
    });

    memberFarFuture = await Member.create({
      name: 'Alert Member Far Future',
      email: `far_future_${Date.now()}@test.com`,
      membership_expiry: addDaysToDateString(todayStr, 20),
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await sequelize.close();
  });

  // ────────────────────────────────────────────────────────────────
  // Test 1 — Alert retrieval, categorization, and count
  // ────────────────────────────────────────────────────────────────
  it('Test 1: should retrieve active alerts with categorization, days calculation, and total count', async () => {
    const res = await request(app)
      .get('/membership-alerts')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { count, membershipExpired: expiredList, membershipExpires: expiringList } = res.body.data;
    expect(typeof count).toBe('number');
    expect(count).toBe(expiredList.length + expiringList.length);

    // Already expired member (today - 3 days)
    const foundExpired = expiredList.find((m) => m.id === memberExpired.id);
    expect(foundExpired).toBeDefined();
    expect(foundExpired.name).toBe(memberExpired.name);
    expect(foundExpired.email).toBe(memberExpired.email);
    expect(foundExpired.membershipExpiryDate).toBe(memberExpired.membership_expiry);
    expect(foundExpired.daysAgo).toBe(3);

    // Member expiring in 4 days
    const foundExpiringSoon = expiringList.find((m) => m.id === memberExpiringSoon.id);
    expect(foundExpiringSoon).toBeDefined();
    expect(foundExpiringSoon.name).toBe(memberExpiringSoon.name);
    expect(foundExpiringSoon.email).toBe(memberExpiringSoon.email);
    expect(foundExpiringSoon.membershipExpiryDate).toBe(memberExpiringSoon.membership_expiry);
    expect(foundExpiringSoon.daysRemaining).toBe(4);

    // Member expiring today
    const foundExpiresToday = expiringList.find((m) => m.id === memberExpiresToday.id);
    expect(foundExpiresToday).toBeDefined();
    expect(foundExpiresToday.daysRemaining).toBe(0);

    // Member with expiry in 20 days should NOT be present in either list
    const foundFarFutureExpired = expiredList.find((m) => m.id === memberFarFuture.id);
    const foundFarFutureExpiring = expiringList.find((m) => m.id === memberFarFuture.id);
    expect(foundFarFutureExpired).toBeUndefined();
    expect(foundFarFutureExpiring).toBeUndefined();
  });

  // ────────────────────────────────────────────────────────────────
  // Test 2 — Role-based authorization
  // ────────────────────────────────────────────────────────────────
  it('Test 2: should enforce staff-only authorization across INSTRUCTOR, MEMBER, and unauthenticated requests', async () => {
    // 1. Unauthenticated requests -> 401
    const unauthGet = await request(app).get('/membership-alerts');
    expect(unauthGet.status).toBe(401);
    expect(unauthGet.body.success).toBe(false);

    const unauthPost = await request(app).post(`/membership-alerts/${memberExpiringSoon.id}/dismiss`);
    expect(unauthPost.status).toBe(401);
    expect(unauthPost.body.success).toBe(false);

    // 2. INSTRUCTOR requests -> 403
    const instGet = await request(app)
      .get('/membership-alerts')
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(instGet.status).toBe(403);
    expect(instGet.body.success).toBe(false);

    const instPost = await request(app)
      .post(`/membership-alerts/${memberExpiringSoon.id}/dismiss`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(instPost.status).toBe(403);
    expect(instPost.body.success).toBe(false);

    // 3. MEMBER requests -> 403
    const memberGet = await request(app)
      .get('/membership-alerts')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberGet.status).toBe(403);
    expect(memberGet.body.success).toBe(false);

    const memberPost = await request(app)
      .post(`/membership-alerts/${memberExpiringSoon.id}/dismiss`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberPost.status).toBe(403);
    expect(memberPost.body.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────
  // Test 3 — Staff dismissal and audit data
  // ────────────────────────────────────────────────────────────────
  it('Test 3: should record staff dismissal audit data and keep membership expiry intact', async () => {
    const originalExpiry = memberExpiringSoon.membership_expiry;

    const res = await request(app)
      .post(`/membership-alerts/${memberExpiringSoon.id}/dismiss`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.member_id).toBe(memberExpiringSoon.id);
    expect(res.body.data.dismissed_by).toBe(staffUser.id);
    expect(res.body.data.dismissed_at).toBeDefined();

    // Verify row in database
    const dismissal = await MemberAlertDismissal.findOne({
      where: { member_id: memberExpiringSoon.id },
    });
    expect(dismissal).not.toBeNull();
    expect(dismissal.dismissed_by).toBe(staffUser.id);
    expect(dismissal.dismissed_at).not.toBeNull();

    // Verify member expiry was NOT altered
    const memberAfter = await Member.findByPk(memberExpiringSoon.id);
    expect(memberAfter.membership_expiry).toBe(originalExpiry);
  });

  // ────────────────────────────────────────────────────────────────
  // Test 4 — Dismissal persistence and count
  // ────────────────────────────────────────────────────────────────
  it('Test 4: should exclude dismissed members from active alerts and reject duplicate dismissal with 409', async () => {
    const res = await request(app)
      .get('/membership-alerts')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const { membershipExpires, membershipExpired } = res.body.data;

    // memberExpiringSoon was dismissed, must not appear
    expect(membershipExpires.find((m) => m.id === memberExpiringSoon.id)).toBeUndefined();
    expect(membershipExpired.find((m) => m.id === memberExpiringSoon.id)).toBeUndefined();

    // Duplicate dismissal attempt -> 409 Conflict
    const dupRes = await request(app)
      .post(`/membership-alerts/${memberExpiringSoon.id}/dismiss`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────
  // Test 5 — Expiry update resets dismissal
  // ────────────────────────────────────────────────────────────────
  it('Test 5: should reset dismissal row when membership_expiry date actually changes', async () => {
    // 1. Verify dismissal currently exists for memberExpiringSoon
    let dismissal = await MemberAlertDismissal.findOne({
      where: { member_id: memberExpiringSoon.id },
    });
    expect(dismissal).not.toBeNull();

    // 2. Reject invalid date payload
    const invalidRes = await request(app)
      .patch(`/members/${memberExpiringSoon.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ membership_expiry: 'invalid-date' });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);

    // 3. Updating other fields or passing identical expiry should NOT delete dismissal
    const noChangeRes = await request(app)
      .patch(`/members/${memberExpiringSoon.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Updated Name Same Expiry',
        membership_expiry: memberExpiringSoon.membership_expiry,
      });
    expect(noChangeRes.status).toBe(200);

    dismissal = await MemberAlertDismissal.findOne({
      where: { member_id: memberExpiringSoon.id },
    });
    expect(dismissal).not.toBeNull(); // Still dismissed

    // 4. Updating membership_expiry to a new date (renewal) -> deletes dismissal atomically
    const newExpiry = addDaysToDateString(todayStr, 30);
    const updateRes = await request(app)
      .patch(`/members/${memberExpiringSoon.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ membership_expiry: newExpiry });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.membership_expiry).toBe(newExpiry);

    // Dismissal row must now be gone
    dismissal = await MemberAlertDismissal.findOne({
      where: { member_id: memberExpiringSoon.id },
    });
    expect(dismissal).toBeNull();
  });

  // ────────────────────────────────────────────────────────────────
  // Test 6 — Reappearance after renewal
  // ────────────────────────────────────────────────────────────────
  it('Test 6: should not show renewed member when > 7 days away, but reappear once entering 7-day window', async () => {
    // 1. With expiry at today + 30 days, member does not appear in alerts
    const alertsFar = await request(app)
      .get('/membership-alerts')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(alertsFar.status).toBe(200);
    expect(alertsFar.body.data.membershipExpires.find((m) => m.id === memberExpiringSoon.id)).toBeUndefined();
    expect(alertsFar.body.data.membershipExpired.find((m) => m.id === memberExpiringSoon.id)).toBeUndefined();

    // 2. Member expiry enters 7-day window (e.g. today + 2 days)
    const alertWindowExpiry = addDaysToDateString(todayStr, 2);
    const enterWindowRes = await request(app)
      .patch(`/members/${memberExpiringSoon.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ membership_expiry: alertWindowExpiry });
    expect(enterWindowRes.status).toBe(200);

    // 3. Member reappears in active alerts
    const alertsReappeared = await request(app)
      .get('/membership-alerts')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(alertsReappeared.status).toBe(200);

    const found = alertsReappeared.body.data.membershipExpires.find((m) => m.id === memberExpiringSoon.id);
    expect(found).toBeDefined();
    expect(found.daysRemaining).toBe(2);
    expect(found.membershipExpiryDate).toBe(alertWindowExpiry);
  });

  // ────────────────────────────────────────────────────────────────
  // Test 7 — Re-dismissal cycle
  // ────────────────────────────────────────────────────────────────
  it('Test 7: should allow staff to dismiss newly reappeared alert and hide it again', async () => {
    // 1. Dismiss the reappeared alert
    const dismissRes = await request(app)
      .post(`/membership-alerts/${memberExpiringSoon.id}/dismiss`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(dismissRes.status).toBe(200);
    expect(dismissRes.body.success).toBe(true);

    // 2. A new dismissal row exists
    const newDismissal = await MemberAlertDismissal.findOne({
      where: { member_id: memberExpiringSoon.id },
    });
    expect(newDismissal).not.toBeNull();
    expect(newDismissal.dismissed_by).toBe(staffUser.id);

    // 3. Member is hidden from active alerts again
    const alertsAfter = await request(app)
      .get('/membership-alerts')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(alertsAfter.status).toBe(200);
    expect(alertsAfter.body.data.membershipExpires.find((m) => m.id === memberExpiringSoon.id)).toBeUndefined();
  });
});
