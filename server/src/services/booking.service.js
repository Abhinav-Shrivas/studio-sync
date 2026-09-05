'use strict';

const { sequelize, Booking, Session } = require('../models');
const bookingRepository = require('../repositories/booking.repository');
const memberRepository = require('../repositories/member.repository');
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../utils/errors');

/**
 * Creates a new booking for a member and session.
 * Enforces membership validity, concurrency-safe capacity check, and atomic timeline insertion.
 */
async function createBooking(data, user) {
  const { member_id, session_id } = data;

  if (!member_id) {
    throw new ValidationError('Member ID is required');
  }
  if (!session_id) {
    throw new ValidationError('Session ID is required');
  }

  const memberId = Number(member_id);
  const sessionId = Number(session_id);

  // 1. Verify member exists
  const member = await memberRepository.findById(memberId);
  if (!member) {
    throw new NotFoundError('Member not found');
  }

  // 2. Verify membership expiry (checked only when creating a new booking)
  const today = new Date().toISOString().slice(0, 10);
  if (member.membership_expiry < today) {
    throw new ValidationError('Member membership has expired.');
  }

  // 3. Concurrency-safe capacity check and creation inside transaction
  return sequelize.transaction(async (t) => {
    // Lock session row to serialize concurrent booking/cancellation requests
    const session = await Session.findByPk(sessionId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // Disallow creating bookings for sessions that have already started or completed
    if (new Date() >= new Date(session.start_time)) {
      throw new ValidationError(
        'Cannot create a booking for a session that has already started or completed.'
      );
    }

    // Check duplicate active booking: prevent more than one active booking (BOOKED or WAITLISTED)
    const existingActiveBooking = await bookingRepository.findActiveBooking(memberId, sessionId, {
      transaction: t,
    });
    if (existingActiveBooking) {
      throw new ConflictError('Member already has an active booking for this session.');
    }

    // Count currently BOOKED members while lock is held
    const bookedCount = await bookingRepository.countBooked(sessionId, { transaction: t });
    const status = bookedCount < session.capacity ? 'BOOKED' : 'WAITLISTED';

    const booking = await bookingRepository.create(
      {
        member_id: memberId,
        session_id: sessionId,
        status,
      },
      { transaction: t }
    );

    // Initial timeline entry in the same transaction
    await bookingRepository.createTimelineEntry(
      {
        booking_id: booking.id,
        from_status: null,
        to_status: status,
        actor_id: user.id,
        change_source: 'USER',
        note: null,
      },
      { transaction: t }
    );

    return bookingRepository.findById(booking.id, { transaction: t });
  });
}

/**
 * Cancels a booking. If BOOKED was cancelled, promotes the earliest waitlisted booking.
 * Both the cancellation and promotion are recorded in the timeline atomically.
 */
async function cancelBooking(bookingId, user) {
  return sequelize.transaction(async (t) => {
    const booking = await Booking.findByPk(Number(bookingId), { transaction: t });
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Allowed transitions: BOOKED -> CANCELLED, WAITLISTED -> CANCELLED
    if (!['BOOKED', 'WAITLISTED'].includes(booking.status)) {
      throw new ValidationError(
        `Cannot cancel booking with status ${booking.status}. Only BOOKED or WAITLISTED bookings can be cancelled.`
      );
    }

    // Lock session row
    const session = await Session.findByPk(booking.session_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!session) {
      throw new NotFoundError('Associated session not found');
    }

    // Disallow cancelling bookings once the session scheduled start time has passed
    if (new Date() >= new Date(session.start_time)) {
      throw new ValidationError(
        'Cannot cancel a booking for a session that has already started or passed. Please settle attendance instead.'
      );
    }

    const oldStatus = booking.status;
    await booking.update({ status: 'CANCELLED' }, { transaction: t });

    // Timeline entry for cancelled booking
    await bookingRepository.createTimelineEntry(
      {
        booking_id: booking.id,
        from_status: oldStatus,
        to_status: 'CANCELLED',
        actor_id: user.id,
        change_source: 'USER',
        note: null,
      },
      { transaction: t }
    );

    let promotedBooking = null;

    // If cancelled booking was BOOKED, promote earliest waitlisted booking
    if (oldStatus === 'BOOKED') {
      const earliestWaitlisted = await bookingRepository.findEarliestWaitlisted(session.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (earliestWaitlisted) {
        await earliestWaitlisted.update({ status: 'BOOKED' }, { transaction: t });

        // Timeline entry for waitlist promotion (SYSTEM source)
        await bookingRepository.createTimelineEntry(
          {
            booking_id: earliestWaitlisted.id,
            from_status: 'WAITLISTED',
            to_status: 'BOOKED',
            actor_id: null,
            change_source: 'SYSTEM',
            note: null,
          },
          { transaction: t }
        );

        promotedBooking = await bookingRepository.findById(earliestWaitlisted.id, { transaction: t });
      }
    }

    const updatedBooking = await bookingRepository.findById(booking.id, { transaction: t });
    return {
      booking: updatedBooking,
      promotedBooking,
    };
  });
}

/**
 * Settles attendance for a BOOKED booking after session start time.
 * Staff can settle any session; Instructors can settle only assigned sessions.
 */
async function settleAttendance(bookingId, data, user) {
  const { status } = data;

  if (!status || !['ATTENDED', 'NO_SHOW'].includes(status)) {
    throw new ValidationError('Status must be either ATTENDED or NO_SHOW.');
  }

  return sequelize.transaction(async (t) => {
    const booking = await bookingRepository.findById(Number(bookingId), { transaction: t });
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.status !== 'BOOKED') {
      throw new ValidationError(
        `Cannot settle booking with status ${booking.status}. Only BOOKED bookings can be settled.`
      );
    }

    const session = booking.session;
    if (!session) {
      throw new NotFoundError('Associated session not found');
    }

    // Settlement is allowed once the session's scheduled start time has passed
    if (new Date() < new Date(session.start_time)) {
      throw new ValidationError('Cannot settle attendance before the session scheduled start time.');
    }

    // Authorization check
    if (user.role === 'INSTRUCTOR') {
      const coInstructorIds = (session.coInstructors || []).map((ci) => ci.id);
      const isAssigned = session.primary_instructor_id === user.id || coInstructorIds.includes(user.id);
      if (!isAssigned) {
        throw new ForbiddenError('Instructors can only settle attendance for sessions they instruct.');
      }
    }

    const settledAt = new Date();
    await booking.update(
      {
        status,
        settled_at: settledAt,
      },
      { transaction: t }
    );

    const note = user.role === 'INSTRUCTOR'
      ? 'Attendance marked by instructor of this session.'
      : (data.note ? data.note.trim() : null);

    await bookingRepository.createTimelineEntry(
      {
        booking_id: booking.id,
        from_status: 'BOOKED',
        to_status: status,
        actor_id: user.id,
        change_source: 'USER',
        note,
      },
      { transaction: t }
    );

    return bookingRepository.findById(booking.id, { transaction: t });
  });
}

/**
 * Appends a staff note to the booking timeline without modifying the booking status.
 * Uses current booking status for both from_status and to_status.
 * Does not require a database transaction.
 */
async function addStaffNote(bookingId, data, user) {
  if (user.role !== 'STAFF') {
    throw new ForbiddenError('Only staff can add timeline notes.');
  }

  const { note } = data;
  if (!note || typeof note !== 'string' || !note.trim()) {
    throw new ValidationError('Note content is required.');
  }

  const booking = await Booking.findByPk(Number(bookingId));
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  const timelineEntry = await bookingRepository.createTimelineEntry({
    booking_id: booking.id,
    from_status: booking.status,
    to_status: booking.status,
    actor_id: user.id,
    change_source: 'USER',
    note: note.trim(),
  });

  return timelineEntry;
}

/**
 * Retrieves the complete append-only audit timeline for a booking.
 * Staff only.
 */
async function getBookingTimeline(bookingId, user) {
  if (user.role !== 'STAFF') {
    throw new ForbiddenError('Only staff can view booking timelines.');
  }

  const booking = await Booking.findByPk(Number(bookingId));
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  return bookingRepository.getTimeline(Number(bookingId));
}

/**
 * Retrieves booking details.
 * Staff can view any booking; Instructors can view only if assigned to the session.
 */
async function getBookingById(bookingId, user) {
  const booking = await bookingRepository.findById(Number(bookingId));
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  if (user.role === 'INSTRUCTOR') {
    const coInstructorIds = (booking.session?.coInstructors || []).map((ci) => ci.id);
    const isAssigned =
      booking.session?.primary_instructor_id === user.id || coInstructorIds.includes(user.id);
    if (!isAssigned) {
      throw new ForbiddenError('Instructors can only view bookings for sessions they instruct.');
    }
  }

  return booking;
}

const VALID_BOOKING_STATUSES = ['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'];
const VALID_SORT_FIELDS = ['booked_at', 'status', 'session'];
const VALID_SORT_ORDERS = ['ASC', 'DESC'];

/**
 * List bookings with filtering, search, sorting, pagination, and role-based scoping.
 */
async function listBookings(query = {}, user) {
  let {
    page = 1,
    limit = 10,
    search,
    class_id,
    session_id,
    status,
    sort_by = 'booked_at',
    sort_order = 'DESC',
  } = query;

  // Validate pagination
  const pageNum = Number(page);
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    throw new ValidationError('Page must be a positive integer');
  }

  const limitNum = Number(limit);
  if (!Number.isInteger(limitNum) || limitNum < 1) {
    throw new ValidationError('Limit must be a positive integer');
  }
  const cappedLimit = Math.min(limitNum, 100);

  // Validate status filter if provided
  let normalizedStatus = null;
  if (status) {
    normalizedStatus = String(status).toUpperCase();
    if (!VALID_BOOKING_STATUSES.includes(normalizedStatus)) {
      throw new ValidationError(`Invalid booking status: ${status}`);
    }
  }

  // Validate class_id filter if provided
  let classId = null;
  if (class_id !== undefined && class_id !== null && class_id !== '') {
    classId = Number(class_id);
    if (!Number.isInteger(classId) || classId <= 0) {
      throw new ValidationError('Invalid class ID');
    }
  }

  // Validate session_id filter if provided
  let sessionId = null;
  if (session_id !== undefined && session_id !== null && session_id !== '') {
    sessionId = Number(session_id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      throw new ValidationError('Invalid session ID');
    }
  }

  // Validate sort_by
  const normalizedSortBy = String(sort_by).toLowerCase();
  if (!VALID_SORT_FIELDS.includes(normalizedSortBy)) {
    throw new ValidationError(`Invalid sort_by field: ${sort_by}`);
  }

  // Validate sort_order
  const normalizedSortOrder = String(sort_order).toUpperCase();
  if (!VALID_SORT_ORDERS.includes(normalizedSortOrder)) {
    throw new ValidationError(`Invalid sort_order: ${sort_order}`);
  }

  // Map sort_by to database order
  let order;
  if (normalizedSortBy === 'booked_at') {
    order = [
      ['created_at', normalizedSortOrder],
      ['id', normalizedSortOrder],
    ];
  } else if (normalizedSortBy === 'status') {
    order = [
      ['status', normalizedSortOrder],
      ['id', 'ASC'],
    ];
  } else if (normalizedSortBy === 'session') {
    order = [
      [{ model: Session, as: 'session' }, 'start_time', normalizedSortOrder],
      ['id', 'ASC'],
    ];
  }

  // Role-based authorization scoping
  let instructorId = null;
  if (user.role === 'INSTRUCTOR') {
    instructorId = user.id;
  } else if (user.role !== 'STAFF') {
    throw new ForbiddenError('Unauthorized to view bookings');
  }

  const offset = (pageNum - 1) * cappedLimit;

  const { count, rows } = await bookingRepository.findAllAndCount(
    {
      search: typeof search === 'string' ? search : null,
      classId,
      sessionId,
      status: normalizedStatus,
      instructorId,
    },
    {
      order,
      limit: cappedLimit,
      offset,
    }
  );

  const totalPages = Math.ceil(count / cappedLimit);
  const serializer = user.role === 'INSTRUCTOR' ? toInstructorBookingResponse : toStaffBookingResponse;

  return {
    bookings: rows.map(serializer),
    pagination: {
      page: pageNum,
      limit: cappedLimit,
      total: count,
      totalPages,
    },
  };
}

/**
 * Staff-facing booking response serializer.
 * Preserves the existing Staff-facing API response representation exactly as it currently exists.
 */
function toStaffBookingResponse(booking) {
  return typeof booking.toJSON === 'function' ? booking.toJSON() : booking;
}

/**
 * Instructor-facing booking response serializer.
 * Returns only fields necessary for an instructor to manage/view bookings for their authorized sessions,
 * excluding administrative fields such as membership expiry, session capacity, and internal timestamps.
 */
function toInstructorBookingResponse(booking) {
  const b = typeof booking.toJSON === 'function' ? booking.toJSON() : booking;

  return {
    id: b.id,
    member_id: b.member_id,
    session_id: b.session_id,
    status: b.status,
    settled_at: b.settled_at,
    createdAt: b.createdAt,
    member: b.member
      ? {
          id: b.member.id,
          name: b.member.name,
          email: b.member.email,
        }
      : null,
    session: b.session
      ? {
          id: b.session.id,
          room: b.session.room,
          start_time: b.session.start_time,
          duration: b.session.duration,
          capacity: b.session.capacity,
          class: b.session.class
            ? {
                id: b.session.class.id,
                title: b.session.class.title,
                discipline: b.session.class.discipline,
              }
            : null,
          primaryInstructor: b.session.primaryInstructor
            ? {
                id: b.session.primaryInstructor.id,
                name: b.session.primaryInstructor.name,
                email: b.session.primaryInstructor.email,
              }
            : null,
          coInstructors: (b.session.coInstructors || []).map((ci) => ({
            id: ci.id,
            name: ci.name,
            email: ci.email,
          })),
        }
      : null,
  };
}

module.exports = {
  createBooking,
  cancelBooking,
  settleAttendance,
  addStaffNote,
  getBookingTimeline,
  getBookingById,
  listBookings,
  toStaffBookingResponse,
  toInstructorBookingResponse,
};
