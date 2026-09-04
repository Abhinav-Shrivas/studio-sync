'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session, SessionCoInstructor, Member, Booking } = require('../../models');

const STAFF_EMAIL = 'staff@studio.com';
const INSTRUCTOR_1_EMAIL = 'priya@studio.com'; // ID: 2
const INSTRUCTOR_2_EMAIL = 'raj@studio.com'; // ID: 3
const PASSWORD = 'password123';

describe('Goal 6: Booking List, Search, Filters, Sorting & Pagination', () => {
  let staffToken;
  let instructor1Token;
  let instructor2Token;
  let testClass1;
  let testClass2;
  let sessionPrimaryInst1;
  let sessionCoInst1;
  let sessionOnlyInst2;
  let memberAlpha;
  let memberBeta;
  let memberGamma;

  const cleanupTestData = async () => {
    await sequelize.query('DELETE FROM "booking_timeline" WHERE "id" > 20');
    await sequelize.query('DELETE FROM "bookings" WHERE "id" > 35');
    await sequelize.query('DELETE FROM "session_co_instructors" WHERE "session_id" > 20');
    await sequelize.query('DELETE FROM "sessions" WHERE "id" > 20');
    await sequelize.query('DELETE FROM "classes" WHERE "id" > 7');
    await sequelize.query('DELETE FROM "members" WHERE "id" > 15');
  };

  beforeAll(async () => {
    await cleanupTestData();

    const staffRes = await request(app)
      .post('/auth/login')
      .send({ email: STAFF_EMAIL, password: PASSWORD });
    staffToken = staffRes.body.data.token;

    const inst1Res = await request(app)
      .post('/auth/login')
      .send({ email: INSTRUCTOR_1_EMAIL, password: PASSWORD });
    instructor1Token = inst1Res.body.data.token;

    const inst2Res = await request(app)
      .post('/auth/login')
      .send({ email: INSTRUCTOR_2_EMAIL, password: PASSWORD });
    instructor2Token = inst2Res.body.data.token;

    // Create 2 test classes
    testClass1 = await Class.create({
      title: `List Class 1 ${Date.now()}`,
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 10,
      is_archived: false,
    });

    testClass2 = await Class.create({
      title: `List Class 2 ${Date.now()}`,
      discipline: 'PILATES',
      default_duration: 45,
      default_capacity: 10,
      is_archived: false,
    });

    // Create sessions:
    // Session A: Primary Instructor = Priya (2), start_time = 2028-06-01 10:00:00
    sessionPrimaryInst1 = await Session.create({
      class_id: testClass1.id,
      room: 'Room A',
      start_time: new Date('2028-06-01T10:00:00.000Z'),
      duration: 60,
      capacity: 5,
      primary_instructor_id: 2,
    });

    // Session B: Primary Instructor = Raj (3), Co-Instructor = Priya (2), start_time = 2028-06-02 10:00:00
    sessionCoInst1 = await Session.create({
      class_id: testClass1.id,
      room: 'Room B',
      start_time: new Date('2028-06-02T10:00:00.000Z'),
      duration: 60,
      capacity: 5,
      primary_instructor_id: 3,
    });
    await SessionCoInstructor.create({
      session_id: sessionCoInst1.id,
      instructor_id: 2,
    });

    // Session C: Primary Instructor = Raj (3), no co-instructors, start_time = 2028-06-03 10:00:00
    sessionOnlyInst2 = await Session.create({
      class_id: testClass2.id,
      room: 'Room C',
      start_time: new Date('2028-06-03T10:00:00.000Z'),
      duration: 45,
      capacity: 5,
      primary_instructor_id: 3,
    });

    // Create test members
    memberAlpha = await Member.create({
      name: 'Alpha Centauri',
      email: `alpha_${Date.now()}@galaxy.org`,
      membership_expiry: '2029-01-01',
    });

    memberBeta = await Member.create({
      name: 'Beta Persei',
      email: `beta_${Date.now()}@star.com`,
      membership_expiry: '2029-01-01',
    });

    memberGamma = await Member.create({
      name: 'Gamma Ray',
      email: `gamma_${Date.now()}@pulsar.io`,
      membership_expiry: '2029-01-01',
    });

    // Create test bookings:
    // Booking 1: Alpha on Session A (Primary Inst 1), status = BOOKED
    await Booking.create({
      member_id: memberAlpha.id,
      session_id: sessionPrimaryInst1.id,
      status: 'BOOKED',
    });

    // Booking 2: Beta on Session B (Co-Inst 1, Primary Inst 2), status = WAITLISTED
    await Booking.create({
      member_id: memberBeta.id,
      session_id: sessionCoInst1.id,
      status: 'WAITLISTED',
    });

    // Booking 3: Gamma on Session C (Only Inst 2), status = BOOKED
    await Booking.create({
      member_id: memberGamma.id,
      session_id: sessionOnlyInst2.id,
      status: 'BOOKED',
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await sequelize.close();
  });

  describe('Staff Access & Pagination', () => {
    it('should allow staff to retrieve paginated bookings with metadata', async () => {
      const res = await request(app)
        .get('/bookings?page=1&limit=2')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination.totalPages).toBe(Math.ceil(res.body.pagination.total / 2));

      // Each booking should include member and session
      const booking = res.body.data[0];
      expect(booking.member).toBeDefined();
      expect(booking.session).toBeDefined();
    });

    it('should reject invalid page or limit with 400 ValidationError', async () => {
      const res1 = await request(app)
        .get('/bookings?page=0')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const res2 = await request(app)
        .get('/bookings?limit=-5')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });
  });

  describe('Instructor Access Isolation', () => {
    it('should allow instructor to see bookings where they are primary instructor OR co-instructor', async () => {
      // Priya (ID 2): Primary on Session A (Alpha), Co-instructor on Session B (Beta). Not on Session C (Gamma).
      const res = await request(app)
        .get(`/bookings?class_id=${testClass1.id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const memberIds = res.body.data.map((b) => b.member_id);
      expect(memberIds).toContain(memberAlpha.id);
      expect(memberIds).toContain(memberBeta.id);
      expect(memberIds).not.toContain(memberGamma.id);
    });

    it('should never expose unrelated session bookings to an instructor, even with query parameter manipulation', async () => {
      // Priya requests Session C (which belongs only to Raj)
      const res = await request(app)
        .get(`/bookings?session_id=${sessionOnlyInst2.id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should return role-based response projection: detailed for staff, restricted for instructor', async () => {
      // 1. Staff receives detailed booking entity with administrative fields
      const staffRes = await request(app)
        .get(`/bookings?class_id=${testClass1.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(200);
      const staffBooking = staffRes.body.data[0];
      expect(staffBooking.member.membership_expiry).toBeDefined();
      expect(staffBooking.session.capacity).toBeDefined();
      expect(staffBooking.createdAt).toBeDefined();

      // 2. Instructor receives only instructor-safe fields
      const instRes = await request(app)
        .get(`/bookings?class_id=${testClass1.id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(instRes.status).toBe(200);
      const instBooking = instRes.body.data[0];
      expect(instBooking.id).toBeDefined();
      expect(instBooking.status).toBeDefined();
      expect(instBooking.createdAt).toBeDefined();
      expect(instBooking.member.name).toBeDefined();
      expect(instBooking.member.email).toBeDefined();
      expect(instBooking.session.room).toBeDefined();
      expect(instBooking.session.start_time).toBeDefined();
      expect(instBooking.session.duration).toBeDefined();
      expect(instBooking.session.capacity).toBeDefined();
      expect(instBooking.session.class.title).toBeDefined();

      // Ensure administrative fields are omitted for instructor
      expect(instBooking.member.membership_expiry).toBeUndefined();
      expect(instBooking.session.createdAt).toBeUndefined();
      expect(instBooking.session.updatedAt).toBeUndefined();
    });
  });

  describe('Search Functionality', () => {
    it('should search case-insensitively by member name', async () => {
      const res = await request(app)
        .get('/bookings?search=CENTAURI')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].member.name).toBe('Alpha Centauri');
    });

    it('should search case-insensitively by member email', async () => {
      const res = await request(app)
        .get(`/bookings?search=PULSAR.IO`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].member.email).toBe(memberGamma.email);
    });

    it('should return empty result for non-matching search', async () => {
      const res = await request(app)
        .get('/bookings?search=NonExistentUserXYZ')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('Filters & Combined Queries', () => {
    it('should combine search, class_id, and status filters', async () => {
      const res = await request(app)
        .get(`/bookings?search=alpha&class_id=${testClass1.id}&status=BOOKED`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].member.name).toBe('Alpha Centauri');
    });

    it('should reject invalid status with 400 ValidationError', async () => {
      const res = await request(app)
        .get('/bookings?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid booking status/i);
    });
  });

  describe('Sorting', () => {
    it('should sort by session start time in both ascending and descending order', async () => {
      // 1. Ascending order
      const ascRes = await request(app)
        .get(`/bookings?class_id=${testClass1.id}&sort_by=session&sort_order=asc`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(ascRes.status).toBe(200);
      expect(ascRes.body.success).toBe(true);
      expect(ascRes.body.data.length).toBe(2);
      const ascTime1 = new Date(ascRes.body.data[0].session.start_time).getTime();
      const ascTime2 = new Date(ascRes.body.data[1].session.start_time).getTime();
      expect(ascTime1).toBeLessThanOrEqual(ascTime2);

      // 2. Descending order
      const descRes = await request(app)
        .get(`/bookings?class_id=${testClass1.id}&sort_by=session&sort_order=desc`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(descRes.status).toBe(200);
      expect(descRes.body.success).toBe(true);
      expect(descRes.body.data.length).toBe(2);
      const descTime1 = new Date(descRes.body.data[0].session.start_time).getTime();
      const descTime2 = new Date(descRes.body.data[1].session.start_time).getTime();
      expect(descTime1).toBeGreaterThanOrEqual(descTime2);
    });

    it('should sort by status', async () => {
      const res = await request(app)
        .get(`/bookings?class_id=${testClass1.id}&sort_by=status&sort_order=asc`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].status).toBe('BOOKED');
      expect(res.body.data[1].status).toBe('WAITLISTED');
    });

    it('should reject invalid sorting parameters with 400 ValidationError', async () => {
      // 1. Disallowed sort_by field
      const res1 = await request(app)
        .get('/bookings?sort_by=unsupported_column')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);
      expect(res1.body.message).toMatch(/invalid sort_by field/i);

      // 2. Invalid sort_order direction
      const res2 = await request(app)
        .get('/bookings?sort_order=SIDEWAYS')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toMatch(/invalid sort_order/i);
    });
  });
});
