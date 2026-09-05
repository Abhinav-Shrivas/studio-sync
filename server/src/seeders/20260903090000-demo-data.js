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

    await queryInterface.sequelize.query(`SELECT setval('"users_id_seq"', (SELECT MAX(id) FROM "users"));`);

    // ════════════════════════════════════════════════════════════════
    // 2. MEMBERS (12 members with varied expiry dates)
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('members', [
      // Active memberships
      { id: 1,  name: 'Aarav Mehta',       email: 'aarav@example.com',     membership_expiry: dateOnly(daysFromNow(90)),  created_at: now, updated_at: now },
      { id: 2,  name: 'Diya Gupta',        email: 'diya@example.com',      membership_expiry: dateOnly(daysFromNow(60)),  created_at: now, updated_at: now },
      { id: 3,  name: 'Arjun Reddy',       email: 'arjun@example.com',     membership_expiry: dateOnly(daysFromNow(120)), created_at: now, updated_at: now },
      { id: 4,  name: 'Meera Joshi',       email: 'meera@example.com',     membership_expiry: dateOnly(daysFromNow(45)),  created_at: now, updated_at: now },
      { id: 5,  name: 'Kabir Nair',        email: 'kabir@example.com',     membership_expiry: dateOnly(daysFromNow(30)),  created_at: now, updated_at: now },
      { id: 6,  name: 'Saanvi Iyer',       email: 'saanvi@example.com',    membership_expiry: dateOnly(daysFromNow(180)), created_at: now, updated_at: now },
      { id: 7,  name: 'Rohan Kapoor',      email: 'rohan@example.com',     membership_expiry: dateOnly(daysFromNow(75)),  created_at: now, updated_at: now },
      { id: 8,  name: 'Isha Verma',        email: 'isha@example.com',      membership_expiry: dateOnly(daysFromNow(200)), created_at: now, updated_at: now },

      // Expiring soon (within 7 days — triggers alerts)
      { id: 9,  name: 'Neha Kulkarni',     email: 'neha@example.com',      membership_expiry: dateOnly(daysFromNow(3)),   created_at: now, updated_at: now },
      { id: 10, name: 'Aditya Rao',        email: 'aditya@example.com',    membership_expiry: dateOnly(daysFromNow(5)),   created_at: now, updated_at: now },

      // Already expired
      { id: 11, name: 'Siddharth Bose',    email: 'siddharth@example.com', membership_expiry: dateOnly(daysFromNow(-10)), created_at: now, updated_at: now },
      { id: 12, name: 'Pooja Agarwal',     email: 'pooja@example.com',     membership_expiry: dateOnly(daysFromNow(-30)), created_at: now, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"members_id_seq"', (SELECT MAX(id) FROM "members"));`);

    // ════════════════════════════════════════════════════════════════
    // 3. CLASSES (8 classes, 1 archived)
    //    New: "Express HIIT" with small default capacity for waitlist testing
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('classes', [
      { id: 1, title: 'Morning Flow Yoga',     description: 'A gentle morning yoga practice to start your day with flexibility and mindfulness.', discipline: 'YOGA',         default_capacity: 15, default_duration: 60, is_archived: false, created_at: now, updated_at: now },
      { id: 2, title: 'Power Pilates',          description: 'High-intensity pilates focusing on core strength and body control.',                discipline: 'PILATES',      default_capacity: 12, default_duration: 45, is_archived: false, created_at: now, updated_at: now },
      { id: 3, title: 'Bollywood Dance',         description: 'Energetic dance class featuring popular Bollywood choreography.',                   discipline: 'DANCE',        default_capacity: 20, default_duration: 60, is_archived: false, created_at: now, updated_at: now },
      { id: 4, title: 'Guided Meditation',       description: 'A calming guided meditation session for stress relief and mental clarity.',         discipline: 'MEDITATION',   default_capacity: 25, default_duration: 30, is_archived: false, created_at: now, updated_at: now },
      { id: 5, title: 'Zumba Fitness',           description: 'High-energy dance fitness combining Latin and international music.',                discipline: 'ZUMBA',        default_capacity: 20, default_duration: 50, is_archived: false, created_at: now, updated_at: now },
      { id: 6, title: 'Strength Training',       description: 'Full-body strength training with weights and resistance bands.',                   discipline: 'STRENGTH',     default_capacity: 10, default_duration: 60, is_archived: false, created_at: now, updated_at: now },
      { id: 7, title: 'Kickboxing Basics',       description: 'Introductory martial arts class. This class has been discontinued.',               discipline: 'MARTIAL_ARTS', default_capacity: 15, default_duration: 45, is_archived: true,  created_at: now, updated_at: now },
      { id: 8, title: 'Express HIIT',            description: 'Fast-paced, high-intensity interval training in a small group setting.',            discipline: 'STRENGTH',     default_capacity: 5,  default_duration: 30, is_archived: false, created_at: now, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"classes_id_seq"', (SELECT MAX(id) FROM "classes"));`);

    // ════════════════════════════════════════════════════════════════
    // 4. SESSIONS
    //    - Past settled:    sessions 1-3 (already settled bookings)
    //    - Past UNSETTLED:  sessions 4-5 (bookings still BOOKED, need attendance)
    //    - Today:           sessions 6-7
    //    - Future:          sessions 8-13
    //    - Future waitlist: session 12 (Express HIIT, cap=5, 5 booked + 3 waitlisted)
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('sessions', [
      // ── Past sessions (SETTLED — attendance already recorded) ──
      { id: 1,  class_id: 1, room: 'Studio A', start_time: sessionTime(-14, 7, 0),  capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 2,  class_id: 3, room: 'Studio A', start_time: sessionTime(-7, 10, 0),  capacity: 20, duration: 60, primary_instructor_id: 4, created_at: now, updated_at: now },
      { id: 3,  class_id: 5, room: 'Studio C', start_time: sessionTime(-7, 18, 0),  capacity: 20, duration: 50, primary_instructor_id: 4, created_at: now, updated_at: now },

      // ── Past sessions (UNSETTLED — bookings still BOOKED, ready for settlement) ──
      { id: 4,  class_id: 2, room: 'Studio B', start_time: sessionTime(-3, 9, 0),   capacity: 12, duration: 45, primary_instructor_id: 3, created_at: now, updated_at: now },
      { id: 5,  class_id: 6, room: 'Studio C', start_time: sessionTime(-2, 17, 0),  capacity: 12, duration: 60, primary_instructor_id: 3, created_at: now, updated_at: now },

      // ── Today's sessions ──
      { id: 6,  class_id: 1, room: 'Studio A', start_time: sessionTime(0, 7, 0),    capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 7,  class_id: 5, room: 'Studio C', start_time: sessionTime(0, 18, 0),   capacity: 20, duration: 50, primary_instructor_id: 4, created_at: now, updated_at: now },

      // ── Future sessions ──
      { id: 8,  class_id: 1, room: 'Studio A', start_time: sessionTime(1, 7, 0),    capacity: 15, duration: 60, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 9,  class_id: 3, room: 'Studio A', start_time: sessionTime(2, 10, 0),   capacity: 20, duration: 60, primary_instructor_id: 4, created_at: now, updated_at: now },
      { id: 10, class_id: 4, room: 'Studio B', start_time: sessionTime(3, 8, 0),    capacity: 25, duration: 30, primary_instructor_id: 2, created_at: now, updated_at: now },
      { id: 11, class_id: 2, room: 'Studio B', start_time: sessionTime(5, 10, 0),   capacity: 12, duration: 45, primary_instructor_id: 3, created_at: now, updated_at: now },

      // ── Express HIIT session (cap=5, heavy waitlisting) ──
      { id: 12, class_id: 8, room: 'Studio C', start_time: sessionTime(4, 17, 0),   capacity: 5,  duration: 30, primary_instructor_id: 3, created_at: now, updated_at: now },

      // ── Another future session ──
      { id: 13, class_id: 5, room: 'Studio C', start_time: sessionTime(7, 18, 0),   capacity: 20, duration: 50, primary_instructor_id: 4, created_at: now, updated_at: now },

      // ── Archived-class session (Kickboxing, past) ──
      { id: 14, class_id: 7, room: 'Studio A', start_time: sessionTime(-21, 16, 0), capacity: 15, duration: 45, primary_instructor_id: 3, created_at: now, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"sessions_id_seq"', (SELECT MAX(id) FROM "sessions"));`);

    // ════════════════════════════════════════════════════════════════
    // 5. SESSION CO-INSTRUCTORS
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('session_co_instructors', [
      { session_id: 1,  instructor_id: 4 },  // Anita assists Priya's past yoga
      { session_id: 2,  instructor_id: 2 },  // Priya assists Anita's past dance
      { session_id: 5,  instructor_id: 2 },  // Priya assists Raj's past strength
      { session_id: 6,  instructor_id: 3 },  // Raj assists Priya's today yoga
      { session_id: 7,  instructor_id: 2 },  // Priya assists Anita's today zumba
      { session_id: 9,  instructor_id: 2 },  // Priya assists Anita's future dance
      { session_id: 13, instructor_id: 3 },  // Raj assists Anita's future zumba
      { session_id: 14, instructor_id: 4 },  // Anita assisted Raj's kickboxing (archived)
    ]);

    // ════════════════════════════════════════════════════════════════
    // 6. BOOKINGS
    // ════════════════════════════════════════════════════════════════
    const pastBookingTime = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const weekAgoBooking  = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const threeDaysAgo    = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo      = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const yesterday       = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const todayBooking    = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await queryInterface.bulkInsert('bookings', [
      // ── Session 1 (Yoga, 2 weeks ago): SETTLED ──
      { id: 1,  member_id: 1, session_id: 1, status: 'ATTENDED',  created_at: pastBookingTime, settled_at: sessionTime(-14, 8, 5),  updated_at: now },
      { id: 2,  member_id: 2, session_id: 1, status: 'ATTENDED',  created_at: pastBookingTime, settled_at: sessionTime(-14, 8, 5),  updated_at: now },
      { id: 3,  member_id: 3, session_id: 1, status: 'NO_SHOW',   created_at: pastBookingTime, settled_at: sessionTime(-14, 8, 5),  updated_at: now },

      // ── Session 2 (Dance, 1 week ago): SETTLED with a cancellation ──
      { id: 4,  member_id: 1, session_id: 2, status: 'ATTENDED',  created_at: weekAgoBooking,  settled_at: sessionTime(-7, 11, 5),  updated_at: now },
      { id: 5,  member_id: 6, session_id: 2, status: 'ATTENDED',  created_at: weekAgoBooking,  settled_at: sessionTime(-7, 11, 5),  updated_at: now },
      { id: 6,  member_id: 8, session_id: 2, status: 'CANCELLED', created_at: weekAgoBooking,  settled_at: null,                    updated_at: now },

      // ── Session 3 (Zumba, 1 week ago): SETTLED ──
      { id: 7,  member_id: 3, session_id: 3, status: 'ATTENDED',  created_at: weekAgoBooking,  settled_at: sessionTime(-7, 19, 0),  updated_at: now },
      { id: 8,  member_id: 4, session_id: 3, status: 'ATTENDED',  created_at: weekAgoBooking,  settled_at: sessionTime(-7, 19, 0),  updated_at: now },

      // ══════════════════════════════════════════════════════════════
      // Sessions 4 & 5: Past but UNSETTLED — ready for attendance settlement testing
      // ══════════════════════════════════════════════════════════════

      // ── Session 4 (Pilates, 3 days ago): 4 bookings, UNSETTLED ──
      { id: 9,  member_id: 1, session_id: 4, status: 'BOOKED',    created_at: threeDaysAgo,    settled_at: null, updated_at: now },
      { id: 10, member_id: 2, session_id: 4, status: 'BOOKED',    created_at: threeDaysAgo,    settled_at: null, updated_at: now },
      { id: 11, member_id: 5, session_id: 4, status: 'BOOKED',    created_at: threeDaysAgo,    settled_at: null, updated_at: now },
      { id: 12, member_id: 7, session_id: 4, status: 'BOOKED',    created_at: threeDaysAgo,    settled_at: null, updated_at: now },

      // ── Session 5 (Strength, 2 days ago): 10 bookings, UNSETTLED — primary settlement demo ──
      { id: 13, member_id: 1,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 14, member_id: 2,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 15, member_id: 3,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 16, member_id: 4,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 17, member_id: 5,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 18, member_id: 6,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 19, member_id: 7,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 20, member_id: 8,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 21, member_id: 9,  session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },
      { id: 22, member_id: 10, session_id: 5, status: 'BOOKED',    created_at: twoDaysAgo,      settled_at: null, updated_at: now },

      // ══════════════════════════════════════════════════════════════
      // Today's sessions
      // ══════════════════════════════════════════════════════════════

      // ── Session 6 (Yoga, today): 3 booked ──
      { id: 23, member_id: 1, session_id: 6, status: 'BOOKED',    created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 24, member_id: 2, session_id: 6, status: 'BOOKED',    created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 25, member_id: 4, session_id: 6, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Session 7 (Zumba, today): 2 booked ──
      { id: 26, member_id: 6, session_id: 7, status: 'BOOKED',    created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 27, member_id: 8, session_id: 7, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ══════════════════════════════════════════════════════════════
      // Future sessions
      // ══════════════════════════════════════════════════════════════

      // ── Session 8 (Yoga, tomorrow): 2 booked ──
      { id: 28, member_id: 1, session_id: 8, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },
      { id: 29, member_id: 7, session_id: 8, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Session 9 (Dance, +2 days): cancel + re-book scenario ──
      { id: 30, member_id: 8, session_id: 9, status: 'CANCELLED', created_at: yesterday,       settled_at: null, updated_at: now },
      { id: 31, member_id: 8, session_id: 9, status: 'BOOKED',    created_at: todayBooking,    settled_at: null, updated_at: now },

      // ── Session 10 (Meditation, +3 days): 1 booked ──
      { id: 32, member_id: 6, session_id: 10, status: 'BOOKED',   created_at: todayBooking,    settled_at: null, updated_at: now },

      // ══════════════════════════════════════════════════════════════
      // Session 12 (Express HIIT, cap=5): FULL + 3 WAITLISTED
      // ══════════════════════════════════════════════════════════════
      { id: 33, member_id: 1, session_id: 12, status: 'BOOKED',     created_at: new Date(todayBooking.getTime() - 5 * 3600000), settled_at: null, updated_at: now },
      { id: 34, member_id: 2, session_id: 12, status: 'BOOKED',     created_at: new Date(todayBooking.getTime() - 4 * 3600000), settled_at: null, updated_at: now },
      { id: 35, member_id: 3, session_id: 12, status: 'BOOKED',     created_at: new Date(todayBooking.getTime() - 3 * 3600000), settled_at: null, updated_at: now },
      { id: 36, member_id: 4, session_id: 12, status: 'BOOKED',     created_at: new Date(todayBooking.getTime() - 2 * 3600000), settled_at: null, updated_at: now },
      { id: 37, member_id: 5, session_id: 12, status: 'BOOKED',     created_at: new Date(todayBooking.getTime() - 1 * 3600000), settled_at: null, updated_at: now },
      { id: 38, member_id: 6, session_id: 12, status: 'WAITLISTED', created_at: todayBooking,                                   settled_at: null, updated_at: now },
      { id: 39, member_id: 7, session_id: 12, status: 'WAITLISTED', created_at: new Date(todayBooking.getTime() + 600000),      settled_at: null, updated_at: now },
      { id: 40, member_id: 8, session_id: 12, status: 'WAITLISTED', created_at: new Date(todayBooking.getTime() + 1200000),     settled_at: null, updated_at: now },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"bookings_id_seq"', (SELECT MAX(id) FROM "bookings"));`);

    // ════════════════════════════════════════════════════════════════
    // 7. BOOKING TIMELINE (history for key bookings)
    // ════════════════════════════════════════════════════════════════
    const staffId = 1;

    await queryInterface.bulkInsert('booking_timeline', [
      // Session 1 settled bookings
      { id: 1,  booking_id: 1, from_status: null,     to_status: 'BOOKED',   actor_id: staffId, change_source: 'USER', note: null,                      created_at: pastBookingTime },
      { id: 2,  booking_id: 1, from_status: 'BOOKED', to_status: 'ATTENDED', actor_id: staffId, change_source: 'USER', note: null,                      created_at: sessionTime(-14, 8, 5) },
      { id: 3,  booking_id: 2, from_status: null,     to_status: 'BOOKED',   actor_id: staffId, change_source: 'USER', note: null,                      created_at: pastBookingTime },
      { id: 4,  booking_id: 2, from_status: 'BOOKED', to_status: 'ATTENDED', actor_id: staffId, change_source: 'USER', note: null,                      created_at: sessionTime(-14, 8, 5) },
      { id: 5,  booking_id: 3, from_status: null,     to_status: 'BOOKED',   actor_id: staffId, change_source: 'USER', note: null,                      created_at: pastBookingTime },
      { id: 6,  booking_id: 3, from_status: 'BOOKED', to_status: 'NO_SHOW',  actor_id: staffId, change_source: 'USER', note: 'Member did not show up.', created_at: sessionTime(-14, 8, 5) },

      // Session 2 cancellation timeline
      { id: 7,  booking_id: 6, from_status: null,     to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER', note: null,                              created_at: weekAgoBooking },
      { id: 8,  booking_id: 6, from_status: 'BOOKED', to_status: 'CANCELLED', actor_id: staffId, change_source: 'USER', note: 'Member requested cancellation.', created_at: new Date(weekAgoBooking.getTime() + 3600000) },

      // Session 4 unsettled — just the initial booking entries
      { id: 9,  booking_id: 9,  from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: threeDaysAgo },
      { id: 10, booking_id: 10, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: threeDaysAgo },
      { id: 11, booking_id: 11, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: threeDaysAgo },
      { id: 12, booking_id: 12, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: threeDaysAgo },

      // Session 5 unsettled — 10 initial booking entries (primary settlement demo)
      { id: 13, booking_id: 13, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 14, booking_id: 14, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 15, booking_id: 15, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 16, booking_id: 16, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 17, booking_id: 17, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 18, booking_id: 18, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 19, booking_id: 19, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 20, booking_id: 20, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 21, booking_id: 21, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },
      { id: 22, booking_id: 22, from_status: null, to_status: 'BOOKED', actor_id: staffId, change_source: 'USER', note: null, created_at: twoDaysAgo },

      // Session 9 cancel + re-book
      { id: 23, booking_id: 30, from_status: null,     to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER', note: null,                               created_at: yesterday },
      { id: 24, booking_id: 30, from_status: 'BOOKED', to_status: 'CANCELLED', actor_id: staffId, change_source: 'USER', note: 'Changed plans, will re-book.',    created_at: new Date(yesterday.getTime() + 7200000) },
      { id: 25, booking_id: 31, from_status: null,     to_status: 'BOOKED',    actor_id: staffId, change_source: 'USER', note: 'Re-booked after cancellation.',    created_at: todayBooking },

      // Session 12 (Express HIIT) waitlist timeline
      { id: 26, booking_id: 38, from_status: null, to_status: 'WAITLISTED', actor_id: staffId, change_source: 'USER', note: 'Session full, added to waitlist.', created_at: todayBooking },
      { id: 27, booking_id: 39, from_status: null, to_status: 'WAITLISTED', actor_id: staffId, change_source: 'USER', note: 'Session full, added to waitlist.', created_at: new Date(todayBooking.getTime() + 600000) },
      { id: 28, booking_id: 40, from_status: null, to_status: 'WAITLISTED', actor_id: staffId, change_source: 'USER', note: 'Session full, added to waitlist.', created_at: new Date(todayBooking.getTime() + 1200000) },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"booking_timeline_id_seq"', (SELECT MAX(id) FROM "booking_timeline"));`);

    // ════════════════════════════════════════════════════════════════
    // 8. MEMBER ALERT DISMISSALS
    // ════════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('member_alert_dismissals', [
      // Siddharth (expired, previously dismissed by staff)
      { id: 1, member_id: 11, dismissed_by: staffId, dismissed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    ]);

    await queryInterface.sequelize.query(`SELECT setval('"member_alert_dismissals_id_seq"', (SELECT MAX(id) FROM "member_alert_dismissals"));`);
  },

  async down(queryInterface) {
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
