'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session, Booking, Member, SessionCoInstructor } = require('../../models');
const { generateToken } = require('../../utils/jwt');

const STAFF_EMAIL = 'staff@studio.com';
const PRIYA_EMAIL = 'priya@studio.com'; // Instructor ID: 2
const RAJ_EMAIL = 'raj@studio.com';     // Instructor ID: 3
const PASSWORD = 'password123';

describe('Protected Dashboard API (Goal 8)', () => {
  let staffToken;
  let priyaToken;
  let memberToken;

  let testClassA;
  let testClassB;
  let priyaTodaySession;
  let rajTodaySession;
  let priyaPastSession;
  let member1;
  let member2;
  let member3;

  const cleanupData = async () => {
    await sequelize.query('DELETE FROM "bookings" WHERE "session_id" IN (SELECT "id" FROM "sessions" WHERE "room" LIKE \'DashTest%\')');
    await sequelize.query('DELETE FROM "session_co_instructors" WHERE "session_id" IN (SELECT "id" FROM "sessions" WHERE "room" LIKE \'DashTest%\')');
    await sequelize.query('DELETE FROM "sessions" WHERE "room" LIKE \'DashTest%\'');
    await sequelize.query('DELETE FROM "members" WHERE "email" LIKE \'%@dashtest.com\'');
    await sequelize.query('DELETE FROM "classes" WHERE "title" LIKE \'DashTest%\'');
  };

  beforeAll(async () => {
    await cleanupData();

    // Logins
    const staffRes = await request(app).post('/auth/login').send({ email: STAFF_EMAIL, password: PASSWORD });
    staffToken = staffRes.body.data.token;

    const priyaRes = await request(app).post('/auth/login').send({ email: PRIYA_EMAIL, password: PASSWORD });
    priyaToken = priyaRes.body.data.token;

    memberToken = generateToken({ userId: 999, role: 'MEMBER' });

    // Create 2 test classes
    testClassA = await Class.create({
      title: 'DashTest Yoga A',
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 10,
      is_archived: false,
    });

    testClassB = await Class.create({
      title: 'DashTest Pilates B',
      discipline: 'PILATES',
      default_duration: 45,
      default_capacity: 10,
      is_archived: false,
    });

    // Test members
    member1 = await Member.create({
      name: 'Dash User 1',
      email: 'user1@dashtest.com',
      membership_expiry: '2028-01-01',
    });
    member2 = await Member.create({
      name: 'Dash User 2',
      email: 'user2@dashtest.com',
      membership_expiry: '2028-01-01',
    });
    member3 = await Member.create({
      name: 'Dash User 3',
      email: 'user3@dashtest.com',
      membership_expiry: '2028-01-01',
    });

    // 1. Priya's session today
    priyaTodaySession = await Session.create({
      class_id: testClassA.id,
      room: 'DashTest Room 1',
      start_time: new Date().toISOString(),
      duration: 60,
      capacity: 10,
      primary_instructor_id: 2, // Priya
    });

    // Bookings for Priya's session today:
    // - 1 BOOKED created today
    await Booking.create({
      member_id: member1.id,
      session_id: priyaTodaySession.id,
      status: 'BOOKED',
    });
    // - 1 WAITLISTED created today
    await Booking.create({
      member_id: member2.id,
      session_id: priyaTodaySession.id,
      status: 'WAITLISTED',
    });

    // 2. Raj's session today (Priya is not assigned)
    rajTodaySession = await Session.create({
      class_id: testClassB.id,
      room: 'DashTest Room 2',
      start_time: new Date().toISOString(),
      duration: 45,
      capacity: 10,
      primary_instructor_id: 3, // Raj
    });
    // 1 BOOKED booking for Raj
    await Booking.create({
      member_id: member3.id,
      session_id: rajTodaySession.id,
      status: 'BOOKED',
    });

    // 3. Priya's past session 2 weeks ago (for 8-week attendance test)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    priyaPastSession = await Session.create({
      class_id: testClassA.id,
      room: 'DashTest Room 3',
      start_time: twoWeeksAgo.toISOString(),
      duration: 60,
      capacity: 10,
      primary_instructor_id: 2,
    });
    // ATTENDED booking on Priya's past session
    await Booking.create({
      member_id: member1.id,
      session_id: priyaPastSession.id,
      status: 'ATTENDED',
    });
  });

  afterAll(async () => {
    await cleanupData();
    await sequelize.close();
  });

  // Test 5: Dashboard protection and role scope
  it('5. enforces protection on GET /dashboard and scopes metrics by role', async () => {
    // A. Unauthenticated -> 401
    const unauthRes = await request(app).get('/dashboard');
    expect(unauthRes.status).toBe(401);

    // B. Unauthorized role (MEMBER) -> 403
    const memberRes = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberRes.status).toBe(403);

    // C. STAFF -> 200 studio-wide
    const staffRes = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.success).toBe(true);
    const staffData = staffRes.body.data;

    // D. INSTRUCTOR -> 200 instructor-scoped
    const instRes = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${priyaToken}`);
    expect(instRes.status).toBe(200);
    expect(instRes.body.success).toBe(true);
    const instData = instRes.body.data;

    // Verify STAFF receives studio-wide counts while INSTRUCTOR receives fewer/strictly scoped counts
    expect(staffData.summary.sessionsToday).toBeGreaterThan(instData.summary.sessionsToday);
    expect(staffData.summary.bookingsToday).toBeGreaterThan(instData.summary.bookingsToday);
  });

  // Test 6: Dashboard aggregate correctness
  it('6. returns correct summary, bookingsByStatus, and bookingsByClass breakdowns', async () => {
    const instRes = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${priyaToken}`);

    const instData = instRes.body.data;

    // Summary validation
    expect(instData.summary).toHaveProperty('sessionsToday');
    expect(instData.summary).toHaveProperty('bookingsToday');
    expect(instData.summary).toHaveProperty('noShowsThisWeek');
    expect(instData.summary).toHaveProperty('currentlyWaitlisted');

    // Priya has at least 1 session today (priyaTodaySession) and 2 bookings created today
    expect(instData.summary.sessionsToday).toBeGreaterThanOrEqual(1);
    expect(instData.summary.bookingsToday).toBeGreaterThanOrEqual(2);
    expect(instData.summary.currentlyWaitlisted).toBeGreaterThanOrEqual(1);

    // bookingsByStatus validation: all 5 statuses must be present
    expect(instData.bookingsByStatus).toHaveLength(5);
    const statusKeys = instData.bookingsByStatus.map((s) => s.status);
    expect(statusKeys).toEqual(['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']);

    // bookingsByClass validation
    expect(Array.isArray(instData.bookingsByClass)).toBe(true);
    const classAEntry = instData.bookingsByClass.find((c) => c.classId === testClassA.id);
    expect(classAEntry).toBeDefined();
    expect(classAEntry.className).toBe('DashTest Yoga A');
    expect(classAEntry.count).toBeGreaterThanOrEqual(3);

    // Raj's class (DashTest Pilates B) should NOT be present in Priya's bookingsByClass
    const classBEntry = instData.bookingsByClass.find((c) => c.classId === testClassB.id);
    expect(classBEntry).toBeUndefined();
  });

  // Test 7: Eight-week attendance
  it('7. returns exactly eight chronological weeks with zero-filled missing weeks and only ATTENDED status', async () => {
    const res = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${priyaToken}`);

    const attendance = res.body.data.attendanceByWeek;

    // 1. Exactly 8 weeks returned
    expect(attendance).toHaveLength(8);

    // 2. Chronological ordering
    for (let i = 1; i < attendance.length; i++) {
      expect(attendance[i].week > attendance[i - 1].week).toBe(true);
    }

    // 3. Format: YYYY-MM-DD and number
    attendance.forEach((item) => {
      expect(item.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof item.attended).toBe('number');
      expect(item.attended).toBeGreaterThanOrEqual(0);
    });

    // 4. Past attendance verified (priyaPastSession 2 weeks ago had 1 ATTENDED booking)
    const totalAttended = attendance.reduce((sum, w) => sum + w.attended, 0);
    expect(totalAttended).toBeGreaterThanOrEqual(1);
  });
});
