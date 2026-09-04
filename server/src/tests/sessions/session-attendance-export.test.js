'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session, Booking, Member, User, SessionCoInstructor } = require('../../models');
const { parseCsvRows } = require('../../utils/csv');

const STAFF_EMAIL = 'staff@studio.com';
const PRIYA_EMAIL = 'priya@studio.com'; // ID: 2
const RAJ_EMAIL = 'raj@studio.com';     // ID: 3
const ANITA_EMAIL = 'anita@studio.com'; // ID: 4
const PASSWORD = 'password123';

describe('Session Attendance CSV Export (Goal 7)', () => {
  let staffToken;
  let priyaToken;
  let rajToken;
  let anitaToken;

  let testClass;
  let testSession;
  let member1;
  let member2;
  let member3;
  let member4;

  const cleanupData = async () => {
    await sequelize.query('DELETE FROM "bookings" WHERE "session_id" IN (SELECT "id" FROM "sessions" WHERE "room" LIKE \'ExportRoom%\')');
    await sequelize.query('DELETE FROM "session_co_instructors" WHERE "session_id" IN (SELECT "id" FROM "sessions" WHERE "room" LIKE \'ExportRoom%\')');
    await sequelize.query('DELETE FROM "sessions" WHERE "room" LIKE \'ExportRoom%\'');
    await sequelize.query('DELETE FROM "members" WHERE "email" LIKE \'%@export-test.com\'');
    await sequelize.query('DELETE FROM "classes" WHERE "title" LIKE \'Export Test%\'');
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

    const anitaRes = await request(app).post('/auth/login').send({ email: ANITA_EMAIL, password: PASSWORD });
    anitaToken = anitaRes.body.data.token;

    // Create test class
    testClass = await Class.create({
      title: 'Export Test Power Yoga',
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 20,
      is_archived: false,
    });

    // Create session: Priya (ID 2) is Primary, Raj (ID 3) is Co-Instructor, Anita (ID 4) is unrelated
    const sessionDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    sessionDate.setUTCHours(9, 30, 0, 0);

    testSession = await Session.create({
      class_id: testClass.id,
      room: 'ExportRoom 1',
      start_time: sessionDate.toISOString(),
      duration: 60,
      capacity: 20,
      primary_instructor_id: 2,
    });

    await SessionCoInstructor.create({
      session_id: testSession.id,
      instructor_id: 3,
    });

    // Create test members
    member1 = await Member.create({
      name: 'Alice Johnson',
      email: 'alice@export-test.com',
      membership_expiry: '2027-01-01',
    });

    member2 = await Member.create({
      name: 'Bob Miller',
      email: 'bob@export-test.com',
      membership_expiry: '2027-01-01',
    });

    member3 = await Member.create({
      name: 'Charlie Davis',
      email: 'charlie@export-test.com',
      membership_expiry: '2027-01-01',
    });

    member4 = await Member.create({
      name: 'Diana Prince',
      email: 'diana@export-test.com',
      membership_expiry: '2027-01-01',
    });

    // Create bookings across different final statuses
    await Booking.create({
      member_id: member1.id,
      session_id: testSession.id,
      status: 'ATTENDED',
    });

    await Booking.create({
      member_id: member2.id,
      session_id: testSession.id,
      status: 'NO_SHOW',
    });

    await Booking.create({
      member_id: member3.id,
      session_id: testSession.id,
      status: 'CANCELLED',
    });

    await Booking.create({
      member_id: member4.id,
      session_id: testSession.id,
      status: 'BOOKED',
    });
  });

  afterAll(async () => {
    await cleanupData();
    await sequelize.close();
  });

  // Test 1: Authorization
  describe('1. Authorization', () => {
    it('allows staff, primary instructor, and co-instructor to export, and rejects unrelated instructors with 403', async () => {
      // 1. Staff can export any session
      const staffRes = await request(app)
        .get(`/sessions/${testSession.id}/attendance/export`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(staffRes.status).toBe(200);

      // 2. Primary instructor (Priya) can export their session
      const priyaRes = await request(app)
        .get(`/sessions/${testSession.id}/attendance/export`)
        .set('Authorization', `Bearer ${priyaToken}`);
      expect(priyaRes.status).toBe(200);

      // 3. Co-instructor (Raj) can export their assigned session
      const rajRes = await request(app)
        .get(`/sessions/${testSession.id}/attendance/export`)
        .set('Authorization', `Bearer ${rajToken}`);
      expect(rajRes.status).toBe(200);

      // 4. Unrelated instructor (Anita) receives 403 Forbidden
      const anitaRes = await request(app)
        .get(`/sessions/${testSession.id}/attendance/export`)
        .set('Authorization', `Bearer ${anitaToken}`);
      expect(anitaRes.status).toBe(403);
      expect(anitaRes.body.success).toBe(false);
      expect(anitaRes.body.message).toMatch(/access/i);
    });
  });

  // Test 2: Successful CSV Export & Structural Validation
  describe('2. Successful CSV export', () => {
    it('returns 200, correct Content-Type, sanitized filename, session metadata, headers, and all bookings', async () => {
      const res = await request(app)
        .get(`/sessions/${testSession.id}/attendance/export`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      const expectedDate = new Date(testSession.start_time).toISOString().slice(0, 10);
      expect(res.headers['content-disposition']).toBe(
        `attachment; filename="attendance-export-test-power-yoga-${expectedDate}.csv"`
      );

      // Structural validation via RFC 4180 CSV parser
      const parsedRows = parseCsvRows(res.text);

      // Metadata assertions
      expect(parsedRows[0]).toEqual(['Session Attendance Report']);
      expect(parsedRows[1]).toEqual(['Class', 'Export Test Power Yoga']);
      expect(parsedRows[2]).toEqual(['Discipline', 'YOGA']);
      expect(parsedRows[3]).toEqual(['Session Date', expectedDate]);
      expect(parsedRows[4]).toEqual(['Start Time', '09:30']);
      expect(parsedRows[5]).toEqual(['Duration', '60 minutes']);
      expect(parsedRows[6]).toEqual(['Room', 'ExportRoom 1']);
      expect(parsedRows[7]).toEqual(['Primary Instructor', 'Priya Sharma']);
      expect(parsedRows[8]).toEqual(['Co-Instructors', 'Raj Patel']);
      expect(parsedRows[9]).toEqual(['Capacity', '20']);
      expect(parsedRows[10]).toEqual(['']); // blank separator

      // Table Header assertion
      expect(parsedRows[11]).toEqual(['Member Name', 'Member Email', 'Final Status', 'Booking Date']);

      // Booking records (4 bookings created)
      expect(parsedRows.length).toBe(16);

      const bookingRows = parsedRows.slice(12);
      expect(bookingRows).toHaveLength(4);

      // Check each row contains valid 4-column structure
      bookingRows.forEach((row) => {
        expect(row).toHaveLength(4);
      });

      const memberEmails = bookingRows.map((r) => r[1]);
      const statuses = bookingRows.map((r) => r[2]);
      const bookingDates = bookingRows.map((r) => r[3]);

      expect(memberEmails).toEqual(
        expect.arrayContaining([
          'alice@export-test.com',
          'bob@export-test.com',
          'charlie@export-test.com',
          'diana@export-test.com',
        ])
      );

      expect(statuses).toEqual(
        expect.arrayContaining(['ATTENDED', 'NO_SHOW', 'CANCELLED', 'BOOKED'])
      );

      // Verify every booking has a non-empty, valid YYYY-MM-DD booking date
      bookingDates.forEach((dateStr) => {
        expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  // Test 3: CSV Escaping (Commas, Quotes, Newlines)
  describe('3. CSV escaping', () => {
    it('correctly handles commas, quotes, and newlines in metadata and booking records without corrupting structure', async () => {
      const escapeClass = await Class.create({
        title: 'Export Test "Advanced, Flow" Yoga\nSpecial Edition',
        discipline: 'YOGA',
        default_duration: 45,
        default_capacity: 10,
        is_archived: false,
      });

      const escapeSession = await Session.create({
        class_id: escapeClass.id,
        room: 'ExportRoom "Studio, A"\nLevel 2',
        start_time: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 45,
        capacity: 10,
        primary_instructor_id: 2,
      });

      // Add two co-instructors to test semicolon and comma handling
      await SessionCoInstructor.create({ session_id: escapeSession.id, instructor_id: 3 });
      await SessionCoInstructor.create({ session_id: escapeSession.id, instructor_id: 4 });

      // Member with commas and quotes in name
      const escapeMember = await Member.create({
        name: 'O\'Connor, "Jack, Jr."\nAthlete',
        email: 'jack.quotes@export-test.com',
        membership_expiry: '2027-01-01',
      });

      await Booking.create({
        member_id: escapeMember.id,
        session_id: escapeSession.id,
        status: 'BOOKED',
      });

      const res = await request(app)
        .get(`/sessions/${escapeSession.id}/attendance/export`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);

      // Structural validation
      const parsedRows = parseCsvRows(res.text);

      // Metadata rows should retain exact values with newlines and quotes intact
      expect(parsedRows[1]).toEqual(['Class', 'Export Test "Advanced, Flow" Yoga\nSpecial Edition']);
      expect(parsedRows[6]).toEqual(['Room', 'ExportRoom "Studio, A"\nLevel 2']);
      expect(parsedRows[8]).toEqual(['Co-Instructors', 'Raj Patel; Anita Desai']);

      // Booking row: must maintain exactly 4 columns despite commas and newlines in member name
      const bookingRow = parsedRows[12];
      expect(bookingRow).toHaveLength(4);
      expect(bookingRow[0]).toBe('O\'Connor, "Jack, Jr."\nAthlete');
      expect(bookingRow[1]).toBe('jack.quotes@export-test.com');
      expect(bookingRow[2]).toBe('BOOKED');
    });
  });

  // Test 4: Empty Session
  describe('4. Empty session', () => {
    it('returns 200, metadata, and booking headers with zero booking rows for a session without bookings', async () => {
      const emptyClass = await Class.create({
        title: 'Export Test Empty Pilates',
        discipline: 'PILATES',
        default_duration: 50,
        default_capacity: 12,
        is_archived: false,
      });

      const emptySession = await Session.create({
        class_id: emptyClass.id,
        room: 'ExportRoom Empty',
        start_time: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 50,
        capacity: 12,
        primary_instructor_id: 2,
      });

      const res = await request(app)
        .get(`/sessions/${emptySession.id}/attendance/export`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      // Structural validation
      const parsedRows = parseCsvRows(res.text);

      // Exactly 12 rows: 10 metadata + 1 empty row + 1 header row + 0 booking rows
      expect(parsedRows.length).toBe(12);
      expect(parsedRows[0]).toEqual(['Session Attendance Report']);
      expect(parsedRows[1]).toEqual(['Class', 'Export Test Empty Pilates']);
      expect(parsedRows[8]).toEqual(['Co-Instructors', 'None']);
      expect(parsedRows[11]).toEqual(['Member Name', 'Member Email', 'Final Status', 'Booking Date']);
    });
  });
});
