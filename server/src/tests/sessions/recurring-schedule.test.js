'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session } = require('../../models');

const STAFF_EMAIL = 'staff@studio.com';
const INSTRUCTOR_EMAIL = 'priya@studio.com'; // ID: 2
const PASSWORD = 'password123';

describe('Recurring Schedule Generation (Goal 7)', () => {
  let staffToken;
  let instructorToken;
  let testClass;

  const cleanupTestData = async () => {
    await sequelize.query('DELETE FROM "session_co_instructors" WHERE "session_id" > 20');
    await sequelize.query('DELETE FROM "bookings" WHERE "id" > 35');
    await sequelize.query('DELETE FROM "sessions" WHERE "id" > 20');
    await sequelize.query('DELETE FROM "classes" WHERE "id" > 7');
  };

  beforeAll(async () => {
    await cleanupTestData();

    const staffRes = await request(app)
      .post('/auth/login')
      .send({ email: STAFF_EMAIL, password: PASSWORD });
    staffToken = staffRes.body.data.token;

    const instRes = await request(app)
      .post('/auth/login')
      .send({ email: INSTRUCTOR_EMAIL, password: PASSWORD });
    instructorToken = instRes.body.data.token;

    testClass = await Class.create({
      title: `Recurring Test Class ${Date.now()}`,
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 15,
      is_archived: false,
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await sequelize.close();
  });

  // 1. Generates weekly occurrences across an inclusive date range and applies defaults/overrides
  it('should generate weekly occurrences across an inclusive date range and apply duration/capacity defaults or overrides', async () => {
    // 2027-01-04, 2027-01-11, 2027-01-18 are 3 consecutive Mondays
    const res = await request(app)
      .post('/sessions/recurring')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        start_date: '2027-01-04',
        end_date: '2027-01-18',
        weekday: 'MONDAY',
        start_time: '10:00',
        room: 'Studio Rec 1',
        primary_instructor_id: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.created).toHaveLength(3);
    expect(res.body.data.skipped).toHaveLength(0);
    expect(res.body.data.summary).toEqual({
      total: 3,
      created_count: 3,
      skipped_count: 0,
    });

    // Verify class defaults were applied
    res.body.data.created.forEach((session) => {
      expect(session.duration).toBe(testClass.default_duration);
      expect(session.capacity).toBe(testClass.default_capacity);
      expect(session.room).toBe('Studio Rec 1');
      expect(session.primary_instructor_id).toBe(2);
    });
  });

  // 2. Skips an existing occurrence with ALREADY_EXISTS without modifying the existing session
  it('should skip an existing occurrence with ALREADY_EXISTS without modifying the existing session', async () => {
    const existingStart = new Date('2027-02-01T10:00:00.000Z');
    const existingSession = await Session.create({
      class_id: testClass.id,
      room: 'Studio Rec Existing',
      start_time: existingStart,
      duration: 45,
      capacity: 8,
      primary_instructor_id: 2,
    });

    // Run recurring generation for that exact date with different duration/capacity
    const res = await request(app)
      .post('/sessions/recurring')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        start_date: '2027-02-01',
        end_date: '2027-02-01',
        weekday: 'MONDAY',
        start_time: '10:00',
        room: 'Studio Rec Existing',
        duration: 90,
        capacity: 30,
        primary_instructor_id: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toHaveLength(0);
    expect(res.body.data.skipped).toHaveLength(1);
    expect(res.body.data.skipped[0].reasons).toContain('ALREADY_EXISTS');

    // Verify existing session duration and capacity were NOT modified
    const reloaded = await Session.findByPk(existingSession.id);
    expect(reloaded.duration).toBe(45);
    expect(reloaded.capacity).toBe(8);
  });

  // 3. Skips room/instructor conflicts and reports both reasons when both conflicts occur
  it('should skip room/instructor conflicts and report both reasons when both conflicts occur', async () => {
    const conflictBaseDate = '2027-03-01'; // Monday
    const prebookedStart = new Date(`${conflictBaseDate}T10:00:00.000Z`);

    // Pre-book room 'Studio Double Conflict' with instructor 3 (duration 60 => ends 11:00)
    await Session.create({
      class_id: testClass.id,
      room: 'Studio Double Conflict',
      start_time: prebookedStart,
      duration: 60,
      capacity: 10,
      primary_instructor_id: 3,
    });

    // Run recurring generation for overlapping window: 10:30 to 11:30 in same room WITH instructor 3
    const res = await request(app)
      .post('/sessions/recurring')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        start_date: conflictBaseDate,
        end_date: conflictBaseDate,
        weekday: 'MONDAY',
        start_time: '10:30',
        duration: 60,
        room: 'Studio Double Conflict',
        primary_instructor_id: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toHaveLength(0);
    expect(res.body.data.skipped).toHaveLength(1);
    expect(res.body.data.skipped[0].reasons).toContain('ROOM_CONFLICT');
    expect(res.body.data.skipped[0].reasons).toContain('INSTRUCTOR_CONFLICT');
  });

  // 4. Demonstrates partial success: valid occurrences are created while conflicted occurrences are skipped
  it('should demonstrate partial success: valid occurrences are created while conflicted occurrences are skipped', async () => {
    // 3 Mondays: 2027-04-05, 2027-04-12, 2027-04-19
    // Pre-book a room conflict only on week 2 (2027-04-12) from another class (seeded class 1)
    const week2Start = new Date('2027-04-12T10:00:00.000Z');
    await Session.create({
      class_id: 1,
      room: 'Studio Partial Room',
      start_time: week2Start,
      duration: 60,
      capacity: 10,
      primary_instructor_id: 4,
    });

    const res = await request(app)
      .post('/sessions/recurring')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        start_date: '2027-04-05',
        end_date: '2027-04-19',
        weekday: 'MONDAY',
        start_time: '10:00',
        duration: 60,
        room: 'Studio Partial Room',
        primary_instructor_id: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toHaveLength(2); // Week 1 and Week 3
    expect(res.body.data.skipped).toHaveLength(1); // Week 2
    expect(res.body.data.skipped[0].date).toBe('2027-04-12');
    expect(res.body.data.skipped[0].reasons).toContain('ROOM_CONFLICT');
    expect(res.body.data.summary).toEqual({
      total: 3,
      created_count: 2,
      skipped_count: 1,
    });
  });

  // 5. Returns an empty result when the date range contains no matching weekday
  it('should return an empty result when the date range contains no matching weekday', async () => {
    // 2027-05-04 is Tuesday, 2027-05-06 is Thursday (no Monday in this range)
    const res = await request(app)
      .post('/sessions/recurring')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        class_id: testClass.id,
        start_date: '2027-05-04',
        end_date: '2027-05-06',
        weekday: 'MONDAY',
        start_time: '10:00',
        room: 'Studio Empty Test',
        primary_instructor_id: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.created).toHaveLength(0);
    expect(res.body.data.skipped).toHaveLength(0);
    expect(res.body.data.summary).toEqual({
      total: 0,
      created_count: 0,
      skipped_count: 0,
    });
  });
});
