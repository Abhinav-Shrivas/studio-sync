'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session, SessionCoInstructor, User } = require('../../models');

const STAFF_EMAIL = 'staff@studio.com';
const PRIYA_EMAIL = 'priya@studio.com'; // Instructor ID: 2
const RAJ_EMAIL = 'raj@studio.com';     // Instructor ID: 3
const ANITA_EMAIL = 'anita@studio.com'; // Instructor ID: 4
const PASSWORD = 'password123';

describe('Instructor Class Discovery & "View My Sessions"', () => {
  let staffToken;
  let priyaToken;
  let rajToken;
  let activeClass1;
  let activeClass2;
  let archivedClass;
  let priyaPrimarySession;
  let priyaCoInstructorSession;
  let rajOnlySession;

  const cleanupData = async () => {
    await sequelize.query('DELETE FROM "session_co_instructors" WHERE "session_id" IN (SELECT "id" FROM "sessions" WHERE "room" LIKE \'InstrDiscovery%\')');
    await sequelize.query('DELETE FROM "bookings" WHERE "session_id" IN (SELECT "id" FROM "sessions" WHERE "room" LIKE \'InstrDiscovery%\')');
    await sequelize.query('DELETE FROM "sessions" WHERE "room" LIKE \'InstrDiscovery%\'');
    await sequelize.query('DELETE FROM "classes" WHERE "title" LIKE \'InstrDiscovery%\'');
  };

  beforeAll(async () => {
    await cleanupData();

    // Log in users
    const staffRes = await request(app).post('/auth/login').send({ email: STAFF_EMAIL, password: PASSWORD });
    staffToken = staffRes.body.data.token;

    const priyaRes = await request(app).post('/auth/login').send({ email: PRIYA_EMAIL, password: PASSWORD });
    priyaToken = priyaRes.body.data.token;

    const rajRes = await request(app).post('/auth/login').send({ email: RAJ_EMAIL, password: PASSWORD });
    rajToken = rajRes.body.data.token;

    // Create 2 active classes and 1 archived class
    activeClass1 = await Class.create({
      title: 'InstrDiscovery Active Yoga',
      description: 'Active yoga class for discovery testing',
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 15,
      is_archived: false,
    });

    activeClass2 = await Class.create({
      title: 'InstrDiscovery Active Pilates',
      description: 'Active pilates class where Priya has no sessions',
      discipline: 'PILATES',
      default_duration: 45,
      default_capacity: 12,
      is_archived: false,
    });

    archivedClass = await Class.create({
      title: 'InstrDiscovery Archived Meditation',
      description: 'Discontinued meditation class',
      discipline: 'MEDITATION',
      default_duration: 30,
      default_capacity: 20,
      is_archived: true,
    });

    // Create sessions under activeClass1:
    // 1. Priya is primary instructor
    priyaPrimarySession = await Session.create({
      class_id: activeClass1.id,
      room: 'InstrDiscovery Room 1',
      start_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      capacity: 15,
      primary_instructor_id: 2,
    });

    // 2. Raj is primary, Priya is co-instructor
    priyaCoInstructorSession = await Session.create({
      class_id: activeClass1.id,
      room: 'InstrDiscovery Room 2',
      start_time: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      capacity: 15,
      primary_instructor_id: 3,
    });
    await SessionCoInstructor.create({
      session_id: priyaCoInstructorSession.id,
      instructor_id: 2,
    });

    // 3. Raj only session under activeClass2 (Priya has NO role here)
    rajOnlySession = await Session.create({
      class_id: activeClass2.id,
      room: 'InstrDiscovery Room 3',
      start_time: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 45,
      capacity: 12,
      primary_instructor_id: 3,
    });
  });

  afterAll(async () => {
    await cleanupData();
    await sequelize.close();
  });

  // Test 1: Instructor active class discovery
  it('1. allows authenticated instructor to discover all active classes and excludes archived classes', async () => {
    const res = await request(app)
      .get('/instructor/classes')
      .set('Authorization', `Bearer ${priyaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const classTitles = res.body.data.map((c) => c.title);
    expect(classTitles).toContain('InstrDiscovery Active Yoga');
    expect(classTitles).toContain('InstrDiscovery Active Pilates');
    expect(classTitles).not.toContain('InstrDiscovery Archived Meditation');

    // Safe instructor projection check
    const yogaCard = res.body.data.find((c) => c.id === activeClass1.id);
    expect(yogaCard).toBeDefined();
    expect(yogaCard).toEqual({
      id: activeClass1.id,
      title: 'InstrDiscovery Active Yoga',
      description: 'Active yoga class for discovery testing',
      discipline: 'YOGA',
    });
    expect(yogaCard.default_duration).toBeUndefined();
    expect(yogaCard.default_capacity).toBeUndefined();
    expect(yogaCard.is_archived).toBeUndefined();
  });

  // Test 2: Instructor view my sessions
  it('2. returns primary instructor and co-instructor sessions for the specified active class', async () => {
    const res = await request(app)
      .get(`/instructor/classes/${activeClass1.id}/sessions`)
      .set('Authorization', `Bearer ${priyaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const sessionIds = res.body.data.map((s) => s.id);
    expect(sessionIds).toContain(priyaPrimarySession.id);
    expect(sessionIds).toContain(priyaCoInstructorSession.id);

    // Verify instructor-safe response projection
    const sessionProj = res.body.data.find((s) => s.id === priyaPrimarySession.id);
    expect(sessionProj.room).toBe('InstrDiscovery Room 1');
    expect(sessionProj.duration).toBe(60);
    expect(sessionProj.capacity).toBe(15);
    expect(sessionProj.class).toEqual({
      id: activeClass1.id,
      title: 'InstrDiscovery Active Yoga',
      discipline: 'YOGA',
    });
    expect(sessionProj.primaryInstructor.id).toBe(2);
    expect(sessionProj.is_archived).toBeUndefined();
  });

  // Test 3: Instructor session isolation & resource visibility
  it('3. isolates sessions between instructors and returns 404 for nonexistent or archived classes', async () => {
    // A. Priya requests activeClass2 where she has no sessions -> returns empty array []
    const emptyRes = await request(app)
      .get(`/instructor/classes/${activeClass2.id}/sessions`)
      .set('Authorization', `Bearer ${priyaToken}`);

    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.success).toBe(true);
    expect(emptyRes.body.data).toEqual([]);

    // But Raj (who teaches activeClass2) sees his session
    const rajRes = await request(app)
      .get(`/instructor/classes/${activeClass2.id}/sessions`)
      .set('Authorization', `Bearer ${rajToken}`);

    expect(rajRes.status).toBe(200);
    const rajSessionIds = rajRes.body.data.map((s) => s.id);
    expect(rajSessionIds).toContain(rajOnlySession.id);

    // B. Nonexistent class returns 404
    const notFoundRes = await request(app)
      .get('/instructor/classes/999999/sessions')
      .set('Authorization', `Bearer ${priyaToken}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.success).toBe(false);

    // C. Archived class returns 404
    const archivedRes = await request(app)
      .get(`/instructor/classes/${archivedClass.id}/sessions`)
      .set('Authorization', `Bearer ${priyaToken}`);
    expect(archivedRes.status).toBe(404);
    expect(archivedRes.body.success).toBe(false);
  });

  // Test 4: Administrative class routes remain STAFF-only
  it('4. strictly blocks instructors from administrative class routes with 403 Forbidden', async () => {
    // GET /classes
    const listRes = await request(app)
      .get('/classes')
      .set('Authorization', `Bearer ${priyaToken}`);
    expect(listRes.status).toBe(403);
    expect(listRes.body.message).toMatch(/insufficient permissions/i);

    // POST /classes
    const createRes = await request(app)
      .post('/classes')
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({
        title: 'Unauthorized Class',
        discipline: 'YOGA',
        default_duration: 60,
        default_capacity: 10,
      });
    expect(createRes.status).toBe(403);

    // PUT /classes/:id
    const updateRes = await request(app)
      .put(`/classes/${activeClass1.id}`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({ title: 'New Title' });
    expect(updateRes.status).toBe(403);

    // POST /classes/:id/archive
    const archiveRes = await request(app)
      .post(`/classes/${activeClass1.id}/archive`)
      .set('Authorization', `Bearer ${priyaToken}`);
    expect(archiveRes.status).toBe(403);
  });
});
