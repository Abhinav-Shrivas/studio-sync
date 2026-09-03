'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session } = require('../../models');

const STAFF_EMAIL = 'staff@studio.com';
const PASSWORD = 'password123';

describe('Class Management API', () => {
  let staffToken;

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
  });

  afterAll(async () => {
    await cleanupTestData();
    await sequelize.close();
  });

  it('should allow staff to create a new class', async () => {
    const uniqueTitle = `Vinyasa Yoga ${Date.now()}`;
    const res = await request(app)
      .post('/classes')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: uniqueTitle,
        description: 'Dynamic flowing yoga sequence',
        discipline: 'YOGA',
        default_duration: 60,
        default_capacity: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      title: uniqueTitle,
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 20,
      is_archived: false,
    });
  });

  it('should reject duplicate class title', async () => {
    // Attempt to create class with title of existing seeded class 'Morning Flow Yoga'
    const res = await request(app)
      .post('/classes')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Morning Flow Yoga',
        discipline: 'YOGA',
        default_duration: 60,
        default_capacity: 15,
      });

    expect([400, 409]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should allow staff to edit class and preserve existing session values', async () => {
    const testClass = await Class.create({
      title: `Editable Class ${Date.now()}`,
      discipline: 'PILATES',
      default_duration: 45,
      default_capacity: 12,
      is_archived: false,
    });

    const session = await Session.create({
      class_id: testClass.id,
      room: 'Studio D',
      start_time: new Date(Date.now() + 48 * 60 * 60 * 1000),
      duration: 45,
      capacity: 12,
      primary_instructor_id: 2,
    });

    // Update class metadata/defaults
    const res = await request(app)
      .put(`/classes/${testClass.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: `Updated Class ${Date.now()}`,
        default_duration: 60,
        default_capacity: 25,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.default_duration).toBe(60);
    expect(res.body.data.default_capacity).toBe(25);

    // Verify existing session duration/capacity didn't change
    const reloadedSession = await Session.findByPk(session.id);
    expect(reloadedSession.duration).toBe(45);
    expect(reloadedSession.capacity).toBe(12);
  });

  it('should archive and restore a class', async () => {
    const testClass = await Class.create({
      title: `Archive Test Class ${Date.now()}`,
      discipline: 'DANCE',
      default_duration: 60,
      default_capacity: 15,
      is_archived: false,
    });

    // Archive class
    const archiveRes = await request(app)
      .post(`/classes/${testClass.id}/archive`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.is_archived).toBe(true);

    // Verify archive hides it from default listing
    const listRes = await request(app)
      .get('/classes')
      .set('Authorization', `Bearer ${staffToken}`);
    const found = listRes.body.data.some((c) => c.id === testClass.id);
    expect(found).toBe(false);

    // Restore class
    const restoreRes = await request(app)
      .post(`/classes/${testClass.id}/restore`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.is_archived).toBe(false);

    // Verify restore makes it active in default listing
    const afterRestoreList = await request(app)
      .get('/classes')
      .set('Authorization', `Bearer ${staffToken}`);
    const foundAfter = afterRestoreList.body.data.some((c) => c.id === testClass.id);
    expect(foundAfter).toBe(true);
  });
});
