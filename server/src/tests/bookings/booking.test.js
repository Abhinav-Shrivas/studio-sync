'use strict';

const request = require('supertest');
const app = require('../../index');
const { sequelize, Class, Session, Member, Booking, BookingTimeline } = require('../../models');

const STAFF_EMAIL = 'staff@studio.com';
const INSTRUCTOR_EMAIL = 'priya@studio.com'; // ID: 2
const OTHER_INSTRUCTOR_EMAIL = 'raj@studio.com'; // ID: 3
const PASSWORD = 'password123';

describe('Booking & Booking Timeline Features', () => {
  let staffToken;
  let instructorToken;
  let otherInstructorToken;
  let testClass;

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

    const instRes = await request(app)
      .post('/auth/login')
      .send({ email: INSTRUCTOR_EMAIL, password: PASSWORD });
    instructorToken = instRes.body.data.token;

    const otherInstRes = await request(app)
      .post('/auth/login')
      .send({ email: OTHER_INSTRUCTOR_EMAIL, password: PASSWORD });
    otherInstructorToken = otherInstRes.body.data.token;

    testClass = await Class.create({
      title: `Booking Test Class ${Date.now()}`,
      discipline: 'YOGA',
      default_duration: 60,
      default_capacity: 10,
      is_archived: false,
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await sequelize.close();
  });

  // ──────────────────────────────────────────────────────────────
  // 1. Booking & Capacity
  // ──────────────────────────────────────────────────────────────
  describe('Booking Creation & Capacity', () => {
    it('should create a BOOKED booking when session has available capacity, along with atomic initial timeline entry', async () => {
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Book 1',
        start_time: new Date('2028-01-01T10:00:00.000Z'),
        duration: 60,
        capacity: 2,
        primary_instructor_id: 2,
      });

      const member = await Member.create({
        name: 'Active Member 1',
        email: `active1_${Date.now()}@example.com`,
        membership_expiry: '2029-01-01',
      });

      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          member_id: member.id,
          session_id: session.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('BOOKED');
      expect(res.body.data.member_id).toBe(member.id);
      expect(res.body.data.session_id).toBe(session.id);

      // Verify atomic initial timeline entry
      const timelineRes = await request(app)
        .get(`/bookings/${res.body.data.id}/timeline`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(timelineRes.status).toBe(200);
      expect(timelineRes.body.data).toHaveLength(1);
      expect(timelineRes.body.data[0].from_status).toBeNull();
      expect(timelineRes.body.data[0].to_status).toBe('BOOKED');
      expect(timelineRes.body.data[0].change_source).toBe('USER');
      expect(timelineRes.body.data[0].actor.id).toBe(1); // staff user id
    });

    it('should create a WAITLISTED booking when session capacity is full, along with initial timeline entry', async () => {
      // Session with capacity 1
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Waitlist 1',
        start_time: new Date('2028-02-01T10:00:00.000Z'),
        duration: 60,
        capacity: 1,
        primary_instructor_id: 2,
      });

      const member1 = await Member.create({
        name: 'Member First',
        email: `first_${Date.now()}@example.com`,
        membership_expiry: '2029-01-01',
      });
      const member2 = await Member.create({
        name: 'Member Waitlisted',
        email: `waitlisted_${Date.now()}@example.com`,
        membership_expiry: '2029-01-01',
      });

      // Fill the only spot
      await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member1.id, session_id: session.id });

      // Second member attempts to book full session
      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member2.id, session_id: session.id });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('WAITLISTED');

      // Verify timeline entry reflects WAITLISTED creation
      const timelineRes = await request(app)
        .get(`/bookings/${res.body.data.id}/timeline`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(timelineRes.body.data[0].from_status).toBeNull();
      expect(timelineRes.body.data[0].to_status).toBe('WAITLISTED');
      expect(timelineRes.body.data[0].change_source).toBe('USER');
    });

    it('should reject a new booking for an expired member with 400 Bad Request', async () => {
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Expired Check',
        start_time: new Date('2028-03-01T10:00:00.000Z'),
        duration: 60,
        capacity: 5,
        primary_instructor_id: 2,
      });

      const expiredMember = await Member.create({
        name: 'Expired Member',
        email: `expired_${Date.now()}@example.com`,
        membership_expiry: '2020-01-01', // Expired in the past
      });

      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          member_id: expiredMember.id,
          session_id: session.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('should reject creating a booking if the session has already started or completed', async () => {
      const pastSession = await Session.create({
        class_id: testClass.id,
        room: 'Studio Past Book Check',
        start_time: new Date(Date.now() - 3600000), // 1 hour ago
        duration: 60,
        capacity: 5,
        primary_instructor_id: 2,
      });

      const member = await Member.create({
        name: 'Past Booking Member',
        email: `past_book_${Date.now()}@test.com`,
        membership_expiry: '2029-01-01',
      });

      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member.id, session_id: pastSession.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already started or completed/i);
    });

    it('should prevent duplicate active booking for the same member and session when BOOKED or WAITLISTED with 409 Conflict', async () => {
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Duplicate Check',
        start_time: new Date('2028-04-01T10:00:00.000Z'),
        duration: 60,
        capacity: 1,
        primary_instructor_id: 2,
      });

      const member1 = await Member.create({
        name: 'Active Booked Member',
        email: `booked_${Date.now()}@example.com`,
        membership_expiry: '2029-01-01',
      });
      const member2 = await Member.create({
        name: 'Active Waitlisted Member',
        email: `waitlisted_${Date.now()}@example.com`,
        membership_expiry: '2029-01-01',
      });

      // Member 1 books -> BOOKED
      await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member1.id, session_id: session.id });

      // Member 1 attempts second booking while BOOKED -> 409
      const dupBookedRes = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member1.id, session_id: session.id });

      expect(dupBookedRes.status).toBe(409);
      expect(dupBookedRes.body.success).toBe(false);
      expect(dupBookedRes.body.message).toMatch(/already has an active booking/i);

      // Member 2 books -> WAITLISTED
      await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member2.id, session_id: session.id });

      // Member 2 attempts second booking while WAITLISTED -> 409
      const dupWaitlistedRes = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member2.id, session_id: session.id });

      expect(dupWaitlistedRes.status).toBe(409);
      expect(dupWaitlistedRes.body.success).toBe(false);
      expect(dupWaitlistedRes.body.message).toMatch(/already has an active booking/i);
    });

    it('should allow rebooking after cancellation, creating a new booking row with its own timeline and preserving previous history', async () => {
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Rebook Check',
        start_time: new Date('2028-04-15T10:00:00.000Z'),
        duration: 60,
        capacity: 5,
        primary_instructor_id: 2,
      });

      const member = await Member.create({
        name: 'Rebooking Member',
        email: `rebook_${Date.now()}@example.com`,
        membership_expiry: '2029-01-01',
      });

      // 1. Initial booking: BOOKED
      const b1Res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member.id, session_id: session.id });

      expect(b1Res.status).toBe(201);
      const b1Id = b1Res.body.data.id;
      expect(b1Res.body.data.status).toBe('BOOKED');

      // 2. Cancel booking 1: CANCELLED
      const cancelRes = await request(app)
        .post(`/bookings/${b1Id}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.booking.status).toBe('CANCELLED');

      // 3. Re-booking: creates a new booking row
      const b2Res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member.id, session_id: session.id });

      expect(b2Res.status).toBe(201);
      const b2Id = b2Res.body.data.id;
      expect(b2Res.body.data.status).toBe('BOOKED');
      expect(b2Id).not.toBe(b1Id); // Distinct new booking row

      // 4. Verify previous booking 1 remains intact in database with its timeline
      const b1Reloaded = await Booking.findByPk(b1Id);
      expect(b1Reloaded.status).toBe('CANCELLED');

      const b1Timeline = await request(app)
        .get(`/bookings/${b1Id}/timeline`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(b1Timeline.body.data).toHaveLength(2);
      expect(b1Timeline.body.data[0].to_status).toBe('BOOKED');
      expect(b1Timeline.body.data[1].to_status).toBe('CANCELLED');

      // 5. Verify new booking 2 has its own fresh initial timeline entry
      const b2Timeline = await request(app)
        .get(`/bookings/${b2Id}/timeline`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(b2Timeline.body.data).toHaveLength(1);
      expect(b2Timeline.body.data[0].from_status).toBeNull();
      expect(b2Timeline.body.data[0].to_status).toBe('BOOKED');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 2. Cancellation & Waitlist Promotion
  // ──────────────────────────────────────────────────────────────
  describe('Cancellation & Waitlist Promotion', () => {
    it('should cancel a BOOKED booking, promote the earliest waitlisted booking to BOOKED atomically with SYSTEM source, and leave subsequent waitlist intact', async () => {
      // Session with capacity 1
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Promo 1',
        start_time: new Date('2028-05-01T10:00:00.000Z'),
        duration: 60,
        capacity: 1,
        primary_instructor_id: 2,
      });

      const m1 = await Member.create({ name: 'Booked M1', email: `m1_${Date.now()}@test.com`, membership_expiry: '2029-01-01' });
      const m2 = await Member.create({ name: 'Waitlist M2', email: `m2_${Date.now()}@test.com`, membership_expiry: '2029-01-01' });
      const m3 = await Member.create({ name: 'Waitlist M3', email: `m3_${Date.now()}@test.com`, membership_expiry: '2029-01-01' });

      // Create BOOKED (m1), then WAITLISTED (m2), then WAITLISTED (m3)
      const b1Res = await request(app).post('/bookings').set('Authorization', `Bearer ${staffToken}`).send({ member_id: m1.id, session_id: session.id });
      const b2Res = await request(app).post('/bookings').set('Authorization', `Bearer ${staffToken}`).send({ member_id: m2.id, session_id: session.id });
      const b3Res = await request(app).post('/bookings').set('Authorization', `Bearer ${staffToken}`).send({ member_id: m3.id, session_id: session.id });

      expect(b1Res.body.data.status).toBe('BOOKED');
      expect(b2Res.body.data.status).toBe('WAITLISTED');
      expect(b3Res.body.data.status).toBe('WAITLISTED');

      // Cancel m1's BOOKED booking
      const cancelRes = await request(app)
        .post(`/bookings/${b1Res.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.booking.status).toBe('CANCELLED');
      expect(cancelRes.body.data.promotedBooking.id).toBe(b2Res.body.data.id);
      expect(cancelRes.body.data.promotedBooking.status).toBe('BOOKED');

      // Verify b2 timeline has SYSTEM promotion entry
      const b2Timeline = await request(app)
        .get(`/bookings/${b2Res.body.data.id}/timeline`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(b2Timeline.body.data).toHaveLength(2);
      expect(b2Timeline.body.data[1].from_status).toBe('WAITLISTED');
      expect(b2Timeline.body.data[1].to_status).toBe('BOOKED');
      expect(b2Timeline.body.data[1].change_source).toBe('SYSTEM');
      expect(b2Timeline.body.data[1].actor).toBeNull();

      // Verify b3 remains WAITLISTED
      const b3Reloaded = await Booking.findByPk(b3Res.body.data.id);
      expect(b3Reloaded.status).toBe('WAITLISTED');
    });

    it('should cancel a WAITLISTED booking without promoting anyone', async () => {
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Wait Cancel',
        start_time: new Date('2028-06-01T10:00:00.000Z'),
        duration: 60,
        capacity: 1,
        primary_instructor_id: 2,
      });

      const m1 = await Member.create({ name: 'Booked M', email: `booked_${Date.now()}@test.com`, membership_expiry: '2029-01-01' });
      const m2 = await Member.create({ name: 'Wait M', email: `wait_${Date.now()}@test.com`, membership_expiry: '2029-01-01' });

      await request(app).post('/bookings').set('Authorization', `Bearer ${staffToken}`).send({ member_id: m1.id, session_id: session.id });
      const b2Res = await request(app).post('/bookings').set('Authorization', `Bearer ${staffToken}`).send({ member_id: m2.id, session_id: session.id });

      const cancelRes = await request(app)
        .post(`/bookings/${b2Res.body.data.id}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.booking.status).toBe('CANCELLED');
      expect(cancelRes.body.data.promotedBooking).toBeNull();
    });

    it('should reject cancelling a booking if the session scheduled start time has already passed', async () => {
      const pastSession = await Session.create({
        class_id: testClass.id,
        room: 'Studio Past Cancel Check',
        start_time: new Date(Date.now() - 3600000), // 1 hour ago
        duration: 60,
        capacity: 5,
        primary_instructor_id: 2,
      });

      const member = await Member.create({
        name: 'Past Booking Member',
        email: `past_cancel_${Date.now()}@test.com`,
        membership_expiry: '2029-01-01',
      });

      const b = await Booking.create({
        member_id: member.id,
        session_id: pastSession.id,
        status: 'BOOKED',
      });

      const cancelRes = await request(app)
        .post(`/bookings/${b.id}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.success).toBe(false);
      expect(cancelRes.body.message).toMatch(/already started or passed/i);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 3. Attendance Settlement & Authorization
  // ──────────────────────────────────────────────────────────────
  describe('Attendance Settlement & Authorization', () => {
    it('should allow attendance settlement after session start time and restrict instructors to their assigned sessions', async () => {
      // Past session assigned to Priya (ID: 2)
      const pastSession = await Session.create({
        class_id: testClass.id,
        room: 'Studio Past Settle',
        start_time: new Date(Date.now() - 3600000), // 1 hour ago
        duration: 60,
        capacity: 5,
        primary_instructor_id: 2,
      });

      const member = await Member.create({
        name: 'Settle Member',
        email: `settle_${Date.now()}@test.com`,
        membership_expiry: '2029-01-01',
      });

      const booking = await Booking.create({
        member_id: member.id,
        session_id: pastSession.id,
        status: 'BOOKED',
      });
      await BookingTimeline.create({
        booking_id: booking.id,
        from_status: null,
        to_status: 'BOOKED',
        actor_id: 1,
        change_source: 'USER',
      });
      const bookingId = booking.id;

      // 1. Unassigned instructor (Raj, ID: 3) attempts settlement -> 403 Forbidden
      const unassignedRes = await request(app)
        .post(`/bookings/${bookingId}/settle`)
        .set('Authorization', `Bearer ${otherInstructorToken}`)
        .send({ status: 'ATTENDED' });

      expect(unassignedRes.status).toBe(403);

      // 2. Assigned instructor (Priya, ID: 2) settles attendance -> 200 OK
      const assignedRes = await request(app)
        .post(`/bookings/${bookingId}/settle`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ status: 'ATTENDED' });

      expect(assignedRes.status).toBe(200);
      expect(assignedRes.body.data.status).toBe('ATTENDED');
      expect(assignedRes.body.data.settled_at).not.toBeNull();

      // Verify instructor settlement timeline contains agreed note
      const timelineRes = await request(app)
        .get(`/bookings/${bookingId}/timeline`)
        .set('Authorization', `Bearer ${staffToken}`);

      const settleEntry = timelineRes.body.data.find((e) => e.to_status === 'ATTENDED');
      expect(settleEntry.change_source).toBe('USER');
      expect(settleEntry.actor.id).toBe(2);
      expect(settleEntry.note).toBe('Attendance marked by instructor of this session.');
    });

    it('should reject attendance settlement before session start time or for non-BOOKED bookings', async () => {
      // Future session
      const futureSession = await Session.create({
        class_id: testClass.id,
        room: 'Studio Future Check',
        start_time: new Date('2028-07-01T10:00:00.000Z'),
        duration: 60,
        capacity: 5,
        primary_instructor_id: 2,
      });

      const member = await Member.create({
        name: 'Future Member',
        email: `future_${Date.now()}@test.com`,
        membership_expiry: '2029-01-01',
      });

      const bookRes = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member.id, session_id: futureSession.id });

      // Attempt settlement before start time -> 400 Bad Request
      const prematureRes = await request(app)
        .post(`/bookings/${bookRes.body.data.id}/settle`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'ATTENDED' });

      expect(prematureRes.status).toBe(400);
      expect(prematureRes.body.message).toMatch(/before the session scheduled start time/i);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 4. Timeline Integrity & Staff Notes
  // ──────────────────────────────────────────────────────────────
  describe('Timeline & Staff Notes', () => {
    it('should allow staff to append a note to the timeline without changing booking status, while keeping history immutable and hidden from instructors', async () => {
      const session = await Session.create({
        class_id: testClass.id,
        room: 'Studio Note Check',
        start_time: new Date('2028-08-01T10:00:00.000Z'),
        duration: 60,
        capacity: 5,
        primary_instructor_id: 2,
      });

      const member = await Member.create({
        name: 'Note Member',
        email: `note_${Date.now()}@test.com`,
        membership_expiry: '2029-01-01',
      });

      const bookRes = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ member_id: member.id, session_id: session.id });

      const bookingId = bookRes.body.data.id;

      // Staff adds a note
      const noteRes = await request(app)
        .post(`/bookings/${bookingId}/timeline/notes`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ note: 'Member called to confirm attendance.' });

      expect(noteRes.status).toBe(201);
      expect(noteRes.body.data.note).toBe('Member called to confirm attendance.');
      expect(noteRes.body.data.from_status).toBe('BOOKED');
      expect(noteRes.body.data.to_status).toBe('BOOKED');
      expect(noteRes.body.data.change_source).toBe('USER');

      // Verify booking status was NOT changed
      const bookingReloaded = await Booking.findByPk(bookingId);
      expect(bookingReloaded.status).toBe('BOOKED');

      // Verify instructor cannot view timeline -> 403 Forbidden
      const instTimelineRes = await request(app)
        .get(`/bookings/${bookingId}/timeline`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(instTimelineRes.status).toBe(403);

      // Verify staff can view complete timeline with both initial creation and staff note
      const staffTimelineRes = await request(app)
        .get(`/bookings/${bookingId}/timeline`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffTimelineRes.status).toBe(200);
      expect(staffTimelineRes.body.data).toHaveLength(2);
      expect(staffTimelineRes.body.data[0].from_status).toBeNull();
      expect(staffTimelineRes.body.data[1].note).toBe('Member called to confirm attendance.');
    });
  });
});
