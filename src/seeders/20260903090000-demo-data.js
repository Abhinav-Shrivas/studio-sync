'use strict';

const bcrypt = require('bcryptjs');

// ──────────────────────────────────────────────────────────────────
// Helper: relative date from today
// ──────────────────────────────────────────────────────────────────
function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function sessionTime(daysOffset, hour, minute = 0) {
  const d = daysFromNow(daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ──────────────────────────────────────────────────────────────────
// Seed credentials (plaintext → hashed at runtime)
// ──────────────────────────────────────────────────────────────────
// staff@studio.com     / password123
// priya@studio.com     / password123
// raj@studio.com       / password123
// anita@studio.com     / password123
// vikram@studio.com    / password123
// ──────────────────────────────────────────────────────────────────

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    // ════════════════════════════════════════════════════════════════
    // 1. USERS (1 staff + 4 instructors)
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('users', [
      { id: 1, name: 'Admin Staff',      email: 'staff@studio.com',  password_hash: hash, role: 'STAFF',      is_active: true,  created_at: now, updated_at: now },
      { id: 2, name: 'Priya Sharma',     email: 'priya@studio.com',  password_hash: hash, role: 'INSTRUCTOR', is_active: true,  created_at: now, updated_at: now },
      { id: 3, name: 'Raj Patel',        email: 'raj@studio.com',    password_hash: hash, role: 'INSTRUCTOR', is_active: true,  created_at: now, updated_at: now },
      { id: 4, name: 'Anita Desai',      email: 'anita@studio.com',  password_hash: hash, role: 'INSTRUCTOR', is_active: true,  created_at: now, updated_at: now },
      { id: 5, name: 'Vikram Singh',     email: 'vikram@studio.com', password_hash: hash, role: 'INSTRUCTOR', is_active: false, created_at: now, updated_at: now },
    ]);

    // Reset sequence so next insert gets id=6
    await queryInterface.sequelize.query(`SELECT setval('"users_id_seq"', (SELECT MAX(id) FROM "users"));`);

    // ════════════════════════════════════════════════════════════════
    // 2. MEMBERS (15 members with varied expiry dates)
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('members', [
      // Active memberships (well into the future)
      { id: 1,  name: 'Aarav Mehta',       email: 'aarav@example.com',    membership_expiry: dateOnly(daysFromNow(90)),  created_at: now, updated_at: now },
      { id: 2,  name: 'Diya Gupta',        email: 'diya@example.com',     membership_expiry: dateOnly(daysFromNow(60)),  created_at: now, updated_at: now },
      { id: 3,  name: 'Arjun Reddy',       email: 'arjun@example.com',    membership_expiry: dateOnly(daysFromNow(120)), created_at: now, updated_at: now },
      { id: 4,  name: 'Meera Joshi',       email: 'meera@example.com',    membership_expiry: dateOnly(daysFromNow(45)),  created_at: now, updated_at: now },
      { id: 5,  name: 'Kabir Nair',        email: 'kabir@example.com',    membership_expiry: dateOnly(daysFromNow(30)),  created_at: now, updated_at: now },
      { id: 6,  name: 'Saanvi Iyer',       email: 'saanvi@example.com',   membership_expiry: dateOnly(daysFromNow(180)), created_at: now, updated_at: now },
      { id: 7,  name: 'Rohan Kapoor',      email: 'rohan@example.com',    membership_expiry: dateOnly(daysFromNow(75)),  created_at: now, updated_at: now },
      { id: 8,  name: 'Isha Verma',        email: 'isha@example.com',     membership_expiry: dateOnly(daysFromNow(200)), created_at: now, updated_at: now },

      // Expiring soon (within 7 days — triggers alerts)
      { id: 9,  name: 'Neha Kulkarni',     email: 'neha@example.com',     membership_expiry: dateOnly(daysFromNow(3)),   created_at: now, updated_at: now },
      { id: 10, name: 'Aditya Rao',        email: 'aditya@example.com',   membership_expiry: dateOnly(daysFromNow(5)),   created_at: now, updated_at: now },
      { id: 11, name: 'Kavya Menon',       email: 'kavya@example.com',    membership_expiry: dateOnly(daysFromNow(1)),   created_at: now, updated_at: now },

      // Already expired
      { id: 12, name: 'Siddharth Bose',    email: 'siddharth@example.com', membership_expiry: dateOnly(daysFromNow(-10)), created_at: now, updated_at: now },
      { id: 13, name: 'Pooja Agarwal',     email: 'pooja@example.com',     membership_expiry: dateOnly(daysFromNow(-30)), created_at: now, updated_at: now },
      { id: 14, name: 'Ravi Shankar',      email: 'ravi@example.com',      membership_expiry: dateOnly(daysFromNow(-5)),  created_at: now, updated_at: now },
      { id: 15, name: 'Tanvi Deshmukh',    email: 'tanvi@example.com',     membership_expiry: dateOnly(daysFromNow(-60)), created_at: now, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"members_id_seq"', (SELECT MAX(id) FROM "members"));`);

    // ════════════════════════════════════════════════════════════════
    // 3. CLASSES (7 classes, 1 archived)
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('classes', [
      { id: 1, title: 'Morning Flow Yoga',     description: 'A gentle morning yoga practice to start your day with flexibility and mindfulness.', discipline: 'YOGA',         default_capacity: 15, default_duration: 60, is_archived: false, created_at: now, updated_at: now },
      { id: 2, title: 'Power Pilates',          description: 'High-intensity pilates focusing on core strength and body control.',                discipline: 'PILATES',      default_capacity: 12, default_duration: 45, is_archived: false, created_at: now, updated_at: now },
      { id: 3, title: 'Bollywood Dance',         description: 'Energetic dance class featuring popular Bollywood choreography.',                   discipline: 'DANCE',        default_capacity: 20, default_duration: 60, is_archived: false, created_at: now, updated_at: now },
      { id: 4, title: 'Guided Meditation',       description: 'A calming guided meditation session for stress relief and mental clarity.',         discipline: 'MEDITATION',   default_capacity: 25, default_duration: 30, is_archived: false, created_at: now, updated_at: now },
      { id: 5, title: 'Zumba Fitness',           description: 'High-energy dance fitness combining Latin and international music.',                discipline: 'ZUMBA',        default_capacity: 20, default_duration: 50, is_archived: false, created_at: now, updated_at: now },
      { id: 6, title: 'Strength Training',       description: 'Full-body strength training with weights and resistance bands.',                   discipline: 'STRENGTH',     default_capacity: 10, default_duration: 60, is_archived: false, created_at: now, updated_at: now },
      { id: 7, title: 'Kickboxing Basics',       description: 'Introductory martial arts class. This class has been discontinued.',               discipline: 'MARTIAL_ARTS', default_capacity: 15, default_duration: 45, is_archived: true,  created_at: now, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"classes_id_seq"', (SELECT MAX(id) FROM "classes"));`);

    // ════════════════════════════════════════════════════════════════
    // 4. SESSIONS (20 sessions: past, today, future)
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('sessions', [
      // ── Past sessions (for attendance settlement) ──
      { id: 1,  class_id: 1, room: 'Studio A', start_time: sessionTime(-14, 7, 0),   capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 2,  class_id: 2, room: 'Studio B', start_time: sessionTime(-14, 9, 0),   capacity: 12, duration: 45, primary_instructor_id: 3, created_at: now, updated_at: now },
      { id: 3,  class_id: 3, room: 'Studio A', start_time: sessionTime(-7, 10, 0),   capacity: 20, duration: 60, primary_instructor_id: 4, created_at: now, updated_at: now },
      { id: 4,  class_id: 1, room: 'Studio A', start_time: sessionTime(-7, 7, 0),    capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 5,  class_id: 5, room: 'Studio C', start_time: sessionTime(-7, 18, 0),   capacity: 20, duration: 50, primary_instructor_id: 4, created_at: now, updated_at: now },
      { id: 6,  class_id: 4, room: 'Studio B', start_time: sessionTime(-3, 8, 0),    capacity: 25, duration: 30, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 7,  class_id: 6, room: 'Studio C', start_time: sessionTime(-2, 17, 0),   capacity: 10, duration: 60, primary_instructor_id: 3, created_at: now, updated_at: now },
      { id: 8,  class_id: 7, room: 'Studio A', start_time: sessionTime(-21, 16, 0),  capacity: 15, duration: 45, primary_instructor_id: 3, created_at: now, updated_at: now },

      // ── Today's sessions ──
      { id: 9,  class_id: 1, room: 'Studio A', start_time: sessionTime(0, 7, 0),     capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 10, class_id: 2, room: 'Studio B', start_time: sessionTime(0, 9, 30),    capacity: 12, duration: 45, primary_instructor_id: 3, created_at: now, updated_at: now },
      { id: 11, class_id: 5, room: 'Studio C', start_time: sessionTime(0, 18, 0),    capacity: 20, duration: 50, primary_instructor_id: 4, created_at: now, updated_at: now },

      // ── Future sessions ──
      { id: 12, class_id: 1, room: 'Studio A', start_time: sessionTime(1, 7, 0),     capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 13, class_id: 3, room: 'Studio A', start_time: sessionTime(2, 10, 0),    capacity: 20, duration: 60, primary_instructor_id: 4, created_at: now, updated_at: now },
      { id: 14, class_id: 4, room: 'Studio B', start_time: sessionTime(3, 8, 0),     capacity: 25, duration: 30, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 15, class_id: 2, room: 'Studio B', start_time: sessionTime(3, 10, 0),    capacity: 12, duration: 45, primary_instructor_id: 3, created_at: now, updated_at: now },
      { id: 16, class_id: 6, room: 'Studio C', start_time: sessionTime(5, 17, 0),    capacity: 10, duration: 60, primary_instructor_id: 3, created_at: now, updated_at: now },
      { id: 17, class_id: 5, room: 'Studio C', start_time: sessionTime(7, 18, 0),    capacity: 20, duration: 50, primary_instructor_id: 4, created_at: now, updated_at: now },
      { id: 18, class_id: 1, room: 'Studio A', start_time: sessionTime(7, 7, 0),     capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      // Small-capacity session to test waitlisting
      { id: 19, class_id: 6, room: 'Studio C', start_time: sessionTime(4, 17, 0),    capacity: 3,  duration: 60, primary_instructor_id: 3, created_at: now, updated_at: now },
      { id: 20, class_id: 3, room: 'Studio A', start_time: sessionTime(10, 10, 0),   capacity: 20, duration: 60, primary_instructor_id: 4, created_at: now, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"sessions_id_seq"', (SELECT MAX(id) FROM "sessions"));`);

    // ════════════════════════════════════════════════════════════════
    // 5. SESSION CO-INSTRUCTORS (8 assignments)
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('session_co_instructors', [
      { session_id: 1,  instructor_id: 4 },  // Anita assists Priya's yoga
      { session_id: 3,  instructor_id: 2 },  // Priya assists Anita's dance
      { session_id: 5,  instructor_id: 2 },  // Priya assists Anita's zumba
      { session_id: 9,  instructor_id: 3 },  // Raj assists Priya's yoga today
      { session_id: 11, instructor_id: 2 },  // Priya assists Anita's zumba today
      { session_id: 13, instructor_id: 2 },  // Priya assists Anita's future dance
      { session_id: 17, instructor_id: 3 },  // Raj assists Anita's future zumba
      { session_id: 8,  instructor_id: 4 },  // Anita assisted Raj's kickboxing (archived class)
    ]);

    // ════════════════════════════════════════════════════════════════
    // 6. BOOKINGS (35 bookings across many scenarios)
    // ════════════════════════════════════════════════════════════════
    const pastBookingTime = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const weekAgoBooking  = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const threeDaysAgo    = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo      = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const yesterday       = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const todayBooking    = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago today

    await queryInterface.bulkInsert('bookings', [
      // ── Past session 1 (Yoga, 2 weeks ago): settled ──
      { id: 1,  member_id: 1,  session_id: 1, status: 'ATTENDED',   created_at: pastBookingTime, settled_at: sessionTime(-14, 8, 5),  updated_at: now },
      { id: 2,  member_id: 2,  session_id: 1, status: 'ATTENDED',   created_at: pastBookingTime, settled_at: sessionTime(-14, 8, 5),  updated_at: now },
      { id: 3,  member_id: 3,  session_id: 1, status: 'NO_SHOW',    created_at: pastBookingTime, settled_at: sessionTime(-14, 8, 5),  updated_at: now },

      // ── Past session 2 (Pilates, 2 weeks ago): settled ──
      { id: 4,  member_id: 4,  session_id: 2, status: 'ATTENDED',   created_at: pastBookingTime, settled_at: sessionTime(-14, 10, 0), updated_at: now },
      { id: 5,  member_id: 5,  session_id: 2, status: 'ATTENDED',   created_at: pastBookingTime, settled_at: sessionTime(-14, 10, 0), updated_at: now },

      // ── Past session 3 (Dance, 1 week ago): mixed ──
      { id: 6,  member_id: 1,  session_id: 3, status: 'ATTENDED',   created_at: weekAgoBooking,  settled_at: sessionTime(-7, 11, 5),  updated_at: now },
      { id: 7,  member_id: 6,  session_id: 3, status: 'ATTENDED',   created_at: weekAgoBooking,  settled_at: sessionTime(-7, 11, 5),  updated_at: now },
      { id: 8,  member_id: 7,  session_id: 3, status: 'NO_SHOW',    created_at: weekAgoBooking,  settled_at: sessionTime(-7, 11, 5),  updated_at: now },
      { id: 9,  member_id: 8,  session_id: 3, status: 'CANCELLED',  created_at: weekAgoBooking,  settled_at: null,                    updated_at: now },

      // ── Past session 4 (Yoga, 1 week ago): settled ──
      { id: 10, member_id: 2,  session_id: 4, status: 'ATTENDED',   created_at: weekAgoBooking,  settled_at: sessionTime(-7, 8, 5),   updated_at: now },
      { id: 11, member_id: 9,  session_id: 4, status: 'ATTENDED',   created_at: weekAgoBooking,  settled_at: sessionTime(-7, 8, 5),   updated_at: now },
      { id: 12, member_id: 10, session_id: 4, status: 'NO_SHOW',    created_at: weekAgoBooking,  settled_at: sessionTime(-7, 8, 5),   updated_at: now },

      // ── Past session 5 (Zumba, 1 week ago): settled ──
      { id: 13, member_id: 3,  session_id: 5, status: 'ATTENDED',   created_at: weekAgoBooking,  settled_at: sessionTime(-7, 19, 0),  updated_at: now },
      { id: 14, member_id: 4,  session_id: 5, status: 'ATTENDED',   created_at: weekAgoBooking,  settled_at: sessionTime(-7, 19, 0),  updated_at: now },

      // ── Past session 6 (Meditation, 3 days ago): settled ──
      { id: 15, member_id: 1,  session_id: 6, status: 'ATTENDED',   created_at: threeDaysAgo,    settled_at: sessionTime(-3, 8, 35),  updated_at: now },
      { id: 16, member_id: 5,  session_id: 6, status: 'NO_SHOW',    created_at: threeDaysAgo,    settled_at: sessionTime(-3, 8, 35),  updated_at: now },

      // ── Past session 7 (Strength, 2 days ago): settled ──
      { id: 17, member_id: 6,  session_id: 7, status: 'ATTENDED',   created_at: twoDaysAgo,      settled_at: sessionTime(-2, 18, 5),  updated_at: now },
      { id: 18, member_id: 7,  session_id: 7, status: 'ATTENDED',   created_at: twoDaysAgo,      settled_at: sessionTime(-2, 18, 5),  updated_at: now },

      // ── Today's session 9 (Yoga): booked ──
      { id: 19, member_id: 1,  session_id: 9, status: 'BOOKED',     created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 20, member_id: 2,  session_id: 9, status: 'BOOKED',     created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 21, member_id: 4,  session_id: 9, status: 'BOOKED',     created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Today's session 10 (Pilates): booked ──
      { id: 22, member_id: 3,  session_id: 10, status: 'BOOKED',    created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 23, member_id: 5,  session_id: 10, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Today's session 11 (Zumba): booked ──
      { id: 24, member_id: 6,  session_id: 11, status: 'BOOKED',    created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 25, member_id: 8,  session_id: 11, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Future session 12 (Yoga, tomorrow): booked ──
      { id: 26, member_id: 1,  session_id: 12, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },
      { id: 27, member_id: 7,  session_id: 12, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Future session 19 (Strength, cap=3): waitlist scenario ──
      { id: 28, member_id: 1,  session_id: 19, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },
      { id: 29, member_id: 2,  session_id: 19, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },
      { id: 30, member_id: 3,  session_id: 19, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },
      { id: 31, member_id: 4,  session_id: 19, status: 'WAITLISTED', created_at: todayBooking,   settled_at: null, updated_at: now },
      { id: 32, member_id: 5,  session_id: 19, status: 'WAITLISTED', created_at: todayBooking,   settled_at: null, updated_at: now },

      // ── Cancelled booking (member later re-books) ──
      { id: 33, member_id: 8,  session_id: 13, status: 'CANCELLED', created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 34, member_id: 8,  session_id: 13, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Future booking ──
      { id: 35, member_id: 6,  session_id: 14, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"bookings_id_seq"', (SELECT MAX(id) FROM "bookings"));`);

    // ════════════════════════════════════════════════════════════════
    // 7. BOOKING TIMELINE (history for key bookings)
    // ════════════════════════════════════════════════════════════════
    const staffId = 1;

    await queryInterface.bulkInsert('booking_timeline', [
      // Booking 1: Created → Attended
      { id: 1,  booking_id: 1, from_status: null,        to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null, created_at: pastBookingTime },
      { id: 2,  booking_id: 1, from_status: 'BOOKED',    to_status: 'ATTENDED',  actor_id: staffId, change_source: 'USER',   note: null, created_at: sessionTime(-14, 8, 5) },

      // Booking 2: Created → Attended
      { id: 3,  booking_id: 2, from_status: null,        to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null, created_at: pastBookingTime },
      { id: 4,  booking_id: 2, from_status: 'BOOKED',    to_status: 'ATTENDED',  actor_id: staffId, change_source: 'USER',   note: null, created_at: sessionTime(-14, 8, 5) },

      // Booking 3: Created → No Show
      { id: 5,  booking_id: 3, from_status: null,        to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null,                                created_at: pastBookingTime },
      { id: 6,  booking_id: 3, from_status: 'BOOKED',    to_status: 'NO_SHOW',   actor_id: staffId, change_source: 'USER',   note: 'Member did not show up.',           created_at: sessionTime(-14, 8, 5) },

      // Booking 9: Created → Cancelled (member cancelled their dance booking)
      { id: 7,  booking_id: 9, from_status: null,        to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null,                                created_at: weekAgoBooking },
      { id: 8,  booking_id: 9, from_status: 'BOOKED',    to_status: 'CANCELLED', actor_id: staffId, change_source: 'USER',   note: 'Member requested cancellation.',    created_at: new Date(weekAgoBooking.getTime() + 3600000) },

      // Booking 6: Created → Attended (same session as cancelled booking 9)
      { id: 9,  booking_id: 6, from_status: null,        to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null, created_at: weekAgoBooking },
      { id: 10, booking_id: 6, from_status: 'BOOKED',    to_status: 'ATTENDED',  actor_id: staffId, change_source: 'USER',   note: null, created_at: sessionTime(-7, 11, 5) },

      // Booking 15: Created → Attended (Meditation)
      { id: 11, booking_id: 15, from_status: null,       to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null, created_at: threeDaysAgo },
      { id: 12, booking_id: 15, from_status: 'BOOKED',   to_status: 'ATTENDED',  actor_id: staffId, change_source: 'USER',   note: null, created_at: sessionTime(-3, 8, 35) },

      // Booking 16: Created → No Show (Meditation)
      { id: 13, booking_id: 16, from_status: null,       to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null,                                created_at: threeDaysAgo },
      { id: 14, booking_id: 16, from_status: 'BOOKED',   to_status: 'NO_SHOW',   actor_id: staffId, change_source: 'USER',   note: 'Second no-show this month.',        created_at: sessionTime(-3, 8, 35) },

      // Booking 19: Created (today's yoga, just booked)
      { id: 15, booking_id: 19, from_status: null,       to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null, created_at: yesterday },

      // Booking 31: Created as Waitlisted (full session)
      { id: 16, booking_id: 31, from_status: null,       to_status: 'WAITLISTED', actor_id: staffId, change_source: 'USER',  note: 'Session full, added to waitlist.',  created_at: todayBooking },

      // Booking 32: Created as Waitlisted
      { id: 17, booking_id: 32, from_status: null,       to_status: 'WAITLISTED', actor_id: staffId, change_source: 'USER',  note: 'Session full, added to waitlist.',  created_at: todayBooking },

      // Booking 33: Created → Cancelled (then member re-booked as booking 34)
      { id: 18, booking_id: 33, from_status: null,       to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: null,                                created_at: yesterday },
      { id: 19, booking_id: 33, from_status: 'BOOKED',   to_status: 'CANCELLED', actor_id: staffId, change_source: 'USER',   note: 'Changed plans, will re-book later.', created_at: new Date(yesterday.getTime() + 7200000) },

      // Booking 34: Re-booking after cancellation
      { id: 20, booking_id: 34, from_status: null,       to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER',   note: 'Re-booked after earlier cancellation.', created_at: todayBooking },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"booking_timeline_id_seq"', (SELECT MAX(id) FROM "booking_timeline"));`);

    // ════════════════════════════════════════════════════════════════
    // 8. MEMBER ALERT DISMISSALS
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('member_alert_dismissals', [
      // Siddharth (expired, dismissed by staff)
      { id: 1, member_id: 12, dismissed_by: staffId, dismissed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), dismissed_expiry: dateOnly(daysFromNow(-10)) },
      // Pooja (expired, dismissed by staff)
      { id: 2, member_id: 13, dismissed_by: staffId, dismissed_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), dismissed_expiry: dateOnly(daysFromNow(-30)) },
      // Neha (expiring in 3 days, not yet dismissed — record exists but fields are null)
      { id: 3, member_id: 9,  dismissed_by: null, dismissed_at: null, dismissed_expiry: null },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"member_alert_dismissals_id_seq"', (SELECT MAX(id) FROM "member_alert_dismissals"));`);
  },

  async down(queryInterface) {
    // Delete in reverse dependency order
    await queryInterface.bulkDelete('member_alert_dismissals', null, {});
    await queryInterface.bulkDelete('booking_timeline', null, {});
    await queryInterface.bulkDelete('bookings', null, {});
    await queryInterface.bulkDelete('session_co_instructors', null, {});
    await queryInterface.bulkDelete('sessions', null, {});
    await queryInterface.bulkDelete('classes', null, {});
    await queryInterface.bulkDelete('members', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
