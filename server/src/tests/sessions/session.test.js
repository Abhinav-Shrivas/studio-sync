'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session, Booking, SessionCoInstructor } = require('../../models');

const STAFF_EMAIL = 'staff@studio.com';
const INSTRUCTOR_EMAIL = 'priya@studio.com'; // ID: 2
const PASSWORD = 'password123';

describe('Session Management API', () => {
  let staffToken;
  let instructorToken;
  let testClass;
  let archivedClass;

  const cleanupTestData = async () => {
    await sequelize.query('DELETE FROM "session_co_instructors" WHERE "session_id" > 20');
    await sequelize.query('DELETE FROM "bookings" WHERE "id" > 35');
    await sequelize.query('DELETE FROM "sessions" WHERE "id" > 20');
    await sequelize.query('DELETE FROM "classes" WHERE "id" > 7');
  };

  beforeAll(async () => {
    await cleanupTestData();

    const sRes = await request(app).post('/auth/login').send({ email: STAFF_EMAIL, password: PASSWORD });
    staffToken = sRes.body.data.token;

    const iRes = await request(app).post('/auth/login').send({ email: INSTRUCTOR_EMAIL, password: PASSWORD });
    instructorToken = iRes.body.data.token;

    testClass = await Class.create({
      title: `Session Test Class ${Date.now()}`,
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 15,
      is_archived: false,
    });

    archivedClass = await Class.create({
      title: `Archived Class For Session ${Date.now()}`,
      discipline: 'MEDITATION',
      default_duration: 30,
      default_capacity: 25,
      is_archived: true,
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await sequelize.close();
  });

  it('should create a session using class defaults', async () => {
    const startTime = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        room: 'Studio X',
        start_time: startTime,
        primary_instructor_id: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.duration).toBe(testClass.default_duration);
    expect(res.body.data.capacity).toBe(testClass.default_capacity);
    expect(res.body.data.primaryInstructor.id).toBe(2);
  });

  it('should reject session creation for an archived class', async () => {
    const startTime = new Date(Date.now() + 51 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: archivedClass.id,
        room: 'Studio X',
        start_time: startTime,
        primary_instructor_id: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/archived class/i);
  });

  it('should reject invalid primary and co-instructor combination', async () => {
    const startTime = new Date(Date.now() + 52 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        room: 'Studio Y',
        start_time: startTime,
        primary_instructor_id: 2,
        co_instructor_ids: [2, 3], // Primary instructor 2 cannot also be co-instructor
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/co-instructor/i);
  });

  it('should reject overlapping room or instructor assignment', async () => {
    const baseStartTime = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    baseStartTime.setHours(10, 0, 0, 0);

    // Create existing session: 10:00 to 11:00 in 'Studio Overlap' with instructor 2
    await Session.create({
      class_id: testClass.id,
      room: 'Studio Overlap',
      start_time: baseStartTime,
      duration: 60,
      capacity: 15,
      primary_instructor_id: 2,
    });

    // 1. Room overlap: 10:30 to 11:30 in same room 'Studio Overlap' with different instructor (4)
    const overlapTime = new Date(baseStartTime.getTime() + 30 * 60 * 1000).toISOString();
    const roomConflictRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        room: 'Studio Overlap',
        start_time: overlapTime,
        duration: 60,
        primary_instructor_id: 4,
      });

    expect([400, 409]).toContain(roomConflictRes.status);
    expect(roomConflictRes.body.message).toMatch(/room.*occupied/i);

    // 2. Instructor overlap: 10:30 to 11:30 with instructor 2 in a different room
    const instructorConflictRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        room: 'Studio Available',
        start_time: overlapTime,
        duration: 60,
        primary_instructor_id: 2,
      });

    expect([400, 409]).toContain(instructorConflictRes.status);
    expect(instructorConflictRes.body.message).toMatch(/overlapping session/i);
  });

  it('should allow adjacent non-overlapping sessions', async () => {
    const baseStartTime = new Date(Date.now() + 61 * 24 * 60 * 60 * 1000);
    baseStartTime.setHours(10, 0, 0, 0);

    // Session 1: 10:00 to 11:00 (duration 60)
    await Session.create({
      class_id: testClass.id,
      room: 'Studio Adjacent',
      start_time: baseStartTime,
      duration: 60,
      capacity: 15,
      primary_instructor_id: 2,
    });

    // Session 2: Starts exactly at 11:00 (adjacent, not overlapping)
    const adjacentStart = new Date(baseStartTime.getTime() + 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        room: 'Studio Adjacent',
        start_time: adjacentStart,
        duration: 60,
        primary_instructor_id: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should allow editing a session before start and reject editing after start', async () => {
    // 1. Edit before start: future session
    const futureStart = new Date(Date.now() + 70 * 24 * 60 * 60 * 1000);
    const session = await Session.create({
      class_id: testClass.id,
      room: 'Studio Freeze Test',
      start_time: futureStart,
      duration: 60,
      capacity: 20,
      primary_instructor_id: 2,
    });

    const editBeforeRes = await request(app)
      .put(`/sessions/${session.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ room: 'Studio Freeze Updated', capacity: 25 });

    expect(editBeforeRes.status).toBe(200);
    expect(editBeforeRes.body.data.room).toBe('Studio Freeze Updated');
    expect(editBeforeRes.body.data.capacity).toBe(25);

    // 2. Edit after start: seeded session 1 is in the past (-14 days)
    const editAfterRes = await request(app)
      .put('/sessions/1')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ capacity: 50 });

    expect(editAfterRes.status).toBe(400);
    expect(editAfterRes.body.message).toMatch(/after it has started/i);
  });

  it('should reject reducing capacity below booked members', async () => {
    const futureStart = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000);
    const session = await Session.create({
      class_id: testClass.id,
      room: 'Studio CapLimit',
      start_time: futureStart,
      duration: 60,
      capacity: 20,
      primary_instructor_id: 2,
    });

    // Create 3 BOOKED members for this session
    await Booking.create({ member_id: 1, session_id: session.id, status: 'BOOKED' });
    await Booking.create({ member_id: 2, session_id: session.id, status: 'BOOKED' });
    await Booking.create({ member_id: 3, session_id: session.id, status: 'BOOKED' });

    // Attempt to reduce capacity to 2 (below current booked count of 3)
    const res = await request(app)
      .put(`/sessions/${session.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ capacity: 2 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/capacity cannot be lower/i);
  });

  it('should delete an unbooked future session and reject deletion when booked', async () => {
    // 1. Delete unbooked future session: succeeds
    const futureStart1 = new Date(Date.now() + 80 * 24 * 60 * 60 * 1000);
    const unbookedSession = await Session.create({
      class_id: testClass.id,
      room: 'Studio Delete Unbooked',
      start_time: futureStart1,
      duration: 60,
      capacity: 10,
      primary_instructor_id: 2,
    });

    const deleteOkRes = await request(app)
      .delete(`/sessions/${unbookedSession.id}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(deleteOkRes.status).toBe(200);
    expect(deleteOkRes.body.success).toBe(true);

    const recheck = await Session.findByPk(unbookedSession.id);
    expect(recheck).toBeNull();

    // 2. Reject deletion when booked
    const futureStart2 = new Date(Date.now() + 81 * 24 * 60 * 60 * 1000);
    const bookedSession = await Session.create({
      class_id: testClass.id,
      room: 'Studio Delete Booked',
      start_time: futureStart2,
      duration: 60,
      capacity: 10,
      primary_instructor_id: 2,
    });

    await Booking.create({ member_id: 1, session_id: bookedSession.id, status: 'BOOKED' });

    const deleteFailRes = await request(app)
      .delete(`/sessions/${bookedSession.id}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(deleteFailRes.status).toBe(400);
    expect(deleteFailRes.body.message).toMatch(/has bookings/i);
  });

  it('should allow instructor to access only sessions where they are primary or co-instructor', async () => {
    const futureStart1 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const futureStart2 = new Date(Date.now() + 91 * 24 * 60 * 60 * 1000);
    const futureStart3 = new Date(Date.now() + 92 * 24 * 60 * 60 * 1000);

    // 1. Session where Instructor 2 is primary
    const primarySession = await Session.create({
      class_id: testClass.id,
      room: 'Studio Access Pri',
      start_time: futureStart1,
      duration: 60,
      capacity: 10,
      primary_instructor_id: 2,
    });

    // 2. Session where Instructor 2 is co-instructor (primary is 3)
    const coSession = await Session.create({
      class_id: testClass.id,
      room: 'Studio Access Co',
      start_time: futureStart2,
      duration: 60,
      capacity: 10,
      primary_instructor_id: 3,
    });
    await SessionCoInstructor.create({ session_id: coSession.id, instructor_id: 2 });

    // 3. Unrelated session where Instructor 2 is neither primary nor co-instructor (primary is 3, co is 4)
    const unrelatedSession = await Session.create({
      class_id: testClass.id,
      room: 'Studio Access None',
      start_time: futureStart3,
      duration: 60,
      capacity: 10,
      primary_instructor_id: 3,
    });
    await SessionCoInstructor.create({ session_id: unrelatedSession.id, instructor_id: 4 });

    // In GET /sessions, instructor should see primary and co-instructor sessions, but NOT unrelated session
    const listRes = await request(app)
      .get('/sessions')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(listRes.status).toBe(200);
    const returnedIds = listRes.body.data.map((s) => s.id);
    expect(returnedIds).toContain(primarySession.id);
    expect(returnedIds).toContain(coSession.id);
    expect(returnedIds).not.toContain(unrelatedSession.id);

    // Single session access: primary session allowed (200)
    const priRes = await request(app)
      .get(`/sessions/${primarySession.id}`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(priRes.status).toBe(200);

    // Single session access: co-instructor session allowed (200)
    const coRes = await request(app)
      .get(`/sessions/${coSession.id}`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(coRes.status).toBe(200);

    // Single session access: unrelated session rejected with 403
    const unrelatedRes = await request(app)
      .get(`/sessions/${unrelatedSession.id}`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(unrelatedRes.status).toBe(403);
    expect(unrelatedRes.body.success).toBe(false);
  });
});
