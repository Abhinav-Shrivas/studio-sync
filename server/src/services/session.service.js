'use strict';

const { sequelize } = require('../models');
const sessionRepository = require('../repositories/session.repository');
const classRepository = require('../repositories/class.repository');
const userRepository = require('../repositories/user.repository');
const { ValidationError, NotFoundError, ForbiddenError, ConflictError } = require('../utils/errors');

/**
 * Calculates the full session end timestamp by adding duration in minutes
 * to the session's start timestamp.
 */
function computeEndTime(startTime, durationMinutes) {
  const start = new Date(startTime);
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Validates an instructor account:
 * - exists
 * - role is 'INSTRUCTOR'
 * - is_active is true
 */
async function validateInstructorAccount(userId, label = 'Instructor', options = {}) {
  const user = await userRepository.findById(userId, options);
  if (!user) {
    throw new ValidationError(`${label} does not exist`);
  }
  if (user.role !== 'INSTRUCTOR') {
    throw new ValidationError(`${label} must have the INSTRUCTOR role`);
  }
  if (!user.is_active) {
    throw new ValidationError(`${label} account is deactivated`);
  }
  return user;
}

/**
 * Validates room non-overlap using:
 * existing.start_time < new.end_time AND new.start_time < existing.end_time
 */
async function validateRoomOverlap(room, startTime, endTime, excludeSessionId = null, options = {}) {
  const overlap = await sessionRepository.findRoomOverlap(room, startTime, endTime, excludeSessionId, options);
  if (overlap) {
    throw new ConflictError('Room is already occupied by another session during this time.');
  }
}

/**
 * Validates instructor non-overlap (primary or co-instructor) using:
 * existing.start_time < new.end_time AND new.start_time < existing.end_time
 */
async function validateInstructorOverlap(instructorId, startTime, endTime, excludeSessionId = null, options = {}, label = 'Instructor') {
  const overlap = await sessionRepository.findInstructorOverlap(instructorId, startTime, endTime, excludeSessionId, options);
  if (overlap) {
    throw new ConflictError(`${label} has an overlapping session.`);
  }
}

async function createSession(data, user) {
  const {
    class_id,
    room,
    start_time,
    duration: rawDuration,
    capacity: rawCapacity,
    primary_instructor_id,
    co_instructor_ids = [],
  } = data;

  if (!class_id) {
    throw new ValidationError('Class ID is required');
  }
  if (!room || typeof room !== 'string' || !room.trim()) {
    throw new ValidationError('Room is required');
  }
  if (!start_time || isNaN(new Date(start_time).getTime())) {
    throw new ValidationError('A valid start time is required');
  }
  if (!primary_instructor_id) {
    throw new ValidationError('Primary instructor ID is required');
  }

  // Verify class exists and is not archived
  const cls = await classRepository.findById(class_id);
  if (!cls) {
    throw new NotFoundError('Class not found');
  }
  if (cls.is_archived) {
    throw new ValidationError('Cannot create a session for an archived class.');
  }

  // When duration/capacity are omitted, copies the current class defaults into the new session.
  // Once copied, session duration/capacity are independent values.
  const duration = rawDuration !== undefined && rawDuration !== null ? Number(rawDuration) : cls.default_duration;
  const capacity = rawCapacity !== undefined && rawCapacity !== null ? Number(rawCapacity) : cls.default_capacity;

  if (!Number.isInteger(duration) || duration <= 0) {
    throw new ValidationError('Session duration must be a positive integer in minutes');
  }
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new ValidationError('Session capacity must be a positive integer');
  }

  const primaryId = Number(primary_instructor_id);
  await validateInstructorAccount(primaryId, 'Primary instructor');

  // Co-instructors validation
  if (!Array.isArray(co_instructor_ids)) {
    throw new ValidationError('co_instructor_ids must be an array of instructor IDs');
  }

  const uniqueCoIds = [...new Set(co_instructor_ids.map(Number))];
  if (uniqueCoIds.length !== co_instructor_ids.length) {
    throw new ValidationError('Duplicate co-instructors are not allowed');
  }

  if (uniqueCoIds.includes(primaryId)) {
    throw new ValidationError('Primary instructor cannot also be a co-instructor for the same session.');
  }

  for (const coId of uniqueCoIds) {
    await validateInstructorAccount(coId, 'Co-instructor');
  }

  // Time & Overlap validation
  const startTime = new Date(start_time);
  const endTime = computeEndTime(startTime, duration);

  await validateRoomOverlap(room.trim(), startTime, endTime);
  await validateInstructorOverlap(primaryId, startTime, endTime, null, {}, 'Primary instructor');

  for (const coId of uniqueCoIds) {
    await validateInstructorOverlap(coId, startTime, endTime, null, {}, 'Co-instructor');
  }

  // Execute in transaction
  return sequelize.transaction(async (t) => {
    const session = await sessionRepository.create(
      {
        class_id: cls.id,
        room: room.trim(),
        start_time: startTime,
        duration,
        capacity,
        primary_instructor_id: primaryId,
      },
      { transaction: t }
    );

    if (uniqueCoIds.length > 0) {
      await sessionRepository.setCoInstructors(session.id, uniqueCoIds, { transaction: t });
    }

    return sessionRepository.findById(session.id, { transaction: t });
  });
}

async function getAllSessions(filters = {}, user = null) {
  const queryFilters = { ...filters };

  // Server-side instructor filtering
  if (user && user.role === 'INSTRUCTOR') {
    queryFilters.instructorId = user.id;
  }

  return sessionRepository.findAll(queryFilters);
}

async function getSessionById(id, user = null) {
  const session = await sessionRepository.findById(id);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  // Server-side instructor authorization check
  if (user && user.role === 'INSTRUCTOR') {
    const isPrimary = session.primary_instructor_id === user.id;
    const isCo = session.coInstructors && session.coInstructors.some((ci) => ci.id === user.id);
    if (!isPrimary && !isCo) {
      throw new ForbiddenError('You do not have access to this session');
    }
  }

  return session;
}

async function updateSession(id, data, user = null) {
  const session = await sessionRepository.findById(id);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  // A session can only be edited before its scheduled start time
  if (new Date() >= new Date(session.start_time)) {
    throw new ValidationError('Cannot edit a session after it has started.');
  }

  // Class change handling
  let newClassId = session.class_id;
  if (data.class_id !== undefined && Number(data.class_id) !== session.class_id) {
    const targetClass = await classRepository.findById(data.class_id);
    if (!targetClass) {
      throw new NotFoundError('Target class not found');
    }
    if (targetClass.is_archived) {
      throw new ValidationError('Cannot change session to an archived class.');
    }
    newClassId = targetClass.id;
    // Does not reset duration or capacity to target class defaults
  }

  const newRoom = data.room !== undefined ? data.room.trim() : session.room;
  const newStartTime = data.start_time !== undefined ? new Date(data.start_time) : new Date(session.start_time);
  const newDuration = data.duration !== undefined ? Number(data.duration) : session.duration;
  const newCapacity = data.capacity !== undefined ? Number(data.capacity) : session.capacity;
  const newPrimaryId = data.primary_instructor_id !== undefined ? Number(data.primary_instructor_id) : session.primary_instructor_id;

  if (isNaN(newStartTime.getTime())) {
    throw new ValidationError('A valid start time is required');
  }
  if (!Number.isInteger(newDuration) || newDuration <= 0) {
    throw new ValidationError('Session duration must be a positive integer in minutes');
  }
  if (!Number.isInteger(newCapacity) || newCapacity <= 0) {
    throw new ValidationError('Session capacity must be a positive integer');
  }

  // Capacity reduction validation
  if (newCapacity < session.capacity) {
    const bookedMembersCount = await sessionRepository.countBookedMembers(id);
    if (newCapacity < bookedMembersCount) {
      throw new ValidationError('Session capacity cannot be lower than the number of booked members.');
    }
  }

  // Instructor validation
  await validateInstructorAccount(newPrimaryId, 'Primary instructor');

  let newCoIds;
  if (data.co_instructor_ids !== undefined) {
    if (!Array.isArray(data.co_instructor_ids)) {
      throw new ValidationError('co_instructor_ids must be an array of instructor IDs');
    }
    newCoIds = [...new Set(data.co_instructor_ids.map(Number))];
    if (newCoIds.length !== data.co_instructor_ids.length) {
      throw new ValidationError('Duplicate co-instructors are not allowed');
    }
  } else {
    newCoIds = await sessionRepository.getCoInstructorIds(id);
  }

  if (newCoIds.includes(newPrimaryId)) {
    throw new ValidationError('Primary instructor cannot also be a co-instructor for the same session.');
  }

  for (const coId of newCoIds) {
    await validateInstructorAccount(coId, 'Co-instructor');
  }

  // Time & Overlap validation
  const newEndTime = computeEndTime(newStartTime, newDuration);

  await validateRoomOverlap(newRoom, newStartTime, newEndTime, id);
  await validateInstructorOverlap(newPrimaryId, newStartTime, newEndTime, id, {}, 'Primary instructor');

  for (const coId of newCoIds) {
    await validateInstructorOverlap(coId, newStartTime, newEndTime, id, {}, 'Co-instructor');
  }

  // Execute in transaction
  return sequelize.transaction(async (t) => {
    await sessionRepository.update(
      id,
      {
        class_id: newClassId,
        room: newRoom,
        start_time: newStartTime,
        duration: newDuration,
        capacity: newCapacity,
        primary_instructor_id: newPrimaryId,
      },
      { transaction: t }
    );

    if (data.co_instructor_ids !== undefined) {
      await sessionRepository.setCoInstructors(id, newCoIds, { transaction: t });
    }

    return sessionRepository.findById(id, { transaction: t });
  });
}

async function deleteSession(id, user = null) {
  const session = await sessionRepository.findById(id);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  // A session cannot be deleted once its scheduled start time has passed, regardless of booking count
  if (new Date() >= new Date(session.start_time)) {
    throw new ValidationError('Cannot delete a session after it has started.');
  }

  // A session can be deleted only when it has no bookings
  const bookingCount = await sessionRepository.countBookingsBySession(id);
  if (bookingCount > 0) {
    throw new ValidationError('Cannot delete a session because it has bookings.');
  }

  return sequelize.transaction(async (t) => {
    await sessionRepository.setCoInstructors(id, [], { transaction: t });
    return sessionRepository.remove(id, { transaction: t });
  });
}

async function addCoInstructor(sessionId, instructorId, user = null) {
  const session = await sessionRepository.findById(sessionId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (new Date() >= new Date(session.start_time)) {
    throw new ValidationError('Cannot edit a session after it has started.');
  }

  const numericInstructorId = Number(instructorId);
  await validateInstructorAccount(numericInstructorId, 'Co-instructor');

  if (session.primary_instructor_id === numericInstructorId) {
    throw new ValidationError('Primary instructor cannot also be a co-instructor for the same session.');
  }

  const existingCoIds = await sessionRepository.getCoInstructorIds(sessionId);
  if (existingCoIds.includes(numericInstructorId)) {
    throw new ValidationError('Instructor is already assigned as a co-instructor for this session.');
  }

  // Check overlap for new co-instructor
  const endTime = computeEndTime(session.start_time, session.duration);
  await validateInstructorOverlap(numericInstructorId, session.start_time, endTime, sessionId, {}, 'Co-instructor');

  await sessionRepository.addCoInstructor(sessionId, numericInstructorId);
  return sessionRepository.findById(sessionId);
}

async function removeCoInstructor(sessionId, instructorId, user = null) {
  const session = await sessionRepository.findById(sessionId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (new Date() >= new Date(session.start_time)) {
    throw new ValidationError('Cannot edit a session after it has started.');
  }

  const numericInstructorId = Number(instructorId);
  const existingCoIds = await sessionRepository.getCoInstructorIds(sessionId);
  if (!existingCoIds.includes(numericInstructorId)) {
    throw new NotFoundError('Co-instructor assignment not found for this session');
  }

  await sessionRepository.removeCoInstructor(sessionId, numericInstructorId);
  return sessionRepository.findById(sessionId);
}

// ────────────────────────────────────────────────────────────────
// Recurring Schedule Generation 
// ────────────────────────────────────────────────────────────────

const WEEKDAY_MAP = {
  SUNDAY: 0, SUN: 0,
  MONDAY: 1, MON: 1,
  TUESDAY: 2, TUE: 2, TUES: 2,
  WEDNESDAY: 3, WED: 3,
  THURSDAY: 4, THU: 4, THURS: 4,
  FRIDAY: 5, FRI: 5,
  SATURDAY: 6, SAT: 6,
};

/**
 * Normalizes weekday input (e.g. 'MONDAY', 'Monday', or 0-6 / 1-7)
 * to a standard 0-6 index where 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
function parseWeekday(val) {
  if (typeof val === 'number') {
    if (val >= 0 && val <= 6) return val;
    if (val === 7) return 0;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim().toUpperCase();
    if (WEEKDAY_MAP[trimmed] !== undefined) {
      return WEEKDAY_MAP[trimmed];
    }
    const num = parseInt(trimmed, 10);
    if (!isNaN(num)) {
      if (num >= 0 && num <= 6) return num;
      if (num === 7) return 0;
    }
  }
  throw new ValidationError(`Invalid weekday: ${val}. Must be Monday through Sunday.`);
}

/**
 * Validates and parses YYYY-MM-DD start and end date strings into UTC Date objects,
 * ensuring both are valid calendar dates and start_date <= end_date.
 */
function parseDateRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    throw new ValidationError('start_date and end_date are required');
  }
  const startParts = String(startDateStr).split('-').map(Number);
  const endParts = String(endDateStr).split('-').map(Number);
  if (startParts.length !== 3 || endParts.length !== 3 || startParts.some(isNaN) || endParts.some(isNaN)) {
    throw new ValidationError('start_date and end_date must be in YYYY-MM-DD format');
  }
  const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
  const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('start_date and end_date must be valid calendar dates');
  }
  if (start.getTime() > end.getTime()) {
    throw new ValidationError('start_date must be before or equal to end_date');
  }
  return { start, end };
}

/**
 * Iterates day-by-day through the inclusive date range [startDate, endDate]
 * and returns all dates (YYYY-MM-DD) matching the target weekday index.
 */
function getMatchingDates(startDate, endDate, targetWeekday) {
  const dates = [];
  const current = new Date(startDate.getTime());
  while (current.getTime() <= endDate.getTime()) {
    if (current.getUTCDay() === targetWeekday) {
      const y = current.getUTCFullYear();
      const m = String(current.getUTCMonth() + 1).padStart(2, '0');
      const d = String(current.getUTCDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Validates and parses HH:mm (or HH:mm:ss) 24-hour time strings into hours,
 * minutes, seconds, and a normalized HH:mm:ss formatted string.
 */
function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new ValidationError('start_time is required');
  }
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) {
    throw new ValidationError('start_time must be in HH:mm format');
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = parts[2] ? Number(parts[2]) : 0;
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new ValidationError('start_time must be a valid time (00:00 to 23:59)');
  }
  return {
    hours,
    minutes,
    seconds,
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}

/**
 * Bulk-generates recurring sessions for a class across an inclusive date range
 * on a specific weekday. Skips existing occurrences (ALREADY_EXISTS) and overlapping
 * room/instructor conflicts while creating all other valid occurrences (partial success).
 */
async function generateRecurringSchedule(data, user = null) {
  const {
    class_id,
    start_date,
    end_date,
    weekday,
    start_time,
    room,
    duration: rawDuration,
    capacity: rawCapacity,
    primary_instructor_id,
    co_instructor_ids = [],
  } = data;

  if (!class_id) {
    throw new ValidationError('Class ID is required');
  }
  if (!room || typeof room !== 'string' || !room.trim()) {
    throw new ValidationError('Room is required');
  }
  if (!primary_instructor_id) {
    throw new ValidationError('Primary instructor ID is required');
  }

  // 1. Verify class exists and is not archived
  const cls = await classRepository.findById(class_id);
  if (!cls) {
    throw new NotFoundError('Class not found');
  }
  if (cls.is_archived) {
    throw new ValidationError('Cannot create sessions for an archived class.');
  }

  // 2. Resolve duration and capacity (defaults vs overrides)
  const duration = rawDuration !== undefined ? Number(rawDuration) : cls.default_duration;
  const capacity = rawCapacity !== undefined ? Number(rawCapacity) : cls.default_capacity;

  if (!Number.isInteger(duration) || duration <= 0) {
    throw new ValidationError('Duration must be a positive integer in minutes');
  }
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new ValidationError('Capacity must be a positive integer');
  }

  // 3. Validate instructors
  const primaryId = Number(primary_instructor_id);
  await validateInstructorAccount(primaryId, 'Primary instructor');

  if (!Array.isArray(co_instructor_ids)) {
    throw new ValidationError('Co-instructor IDs must be an array');
  }

  const numericCoIds = co_instructor_ids.map(Number);
  if (numericCoIds.includes(primaryId)) {
    throw new ValidationError('Primary instructor cannot also be a co-instructor for the same session.');
  }

  const uniqueCoIds = [...new Set(numericCoIds)];
  if (uniqueCoIds.length !== numericCoIds.length) {
    throw new ValidationError('Duplicate co-instructors are not allowed.');
  }

  for (const coId of uniqueCoIds) {
    await validateInstructorAccount(coId, 'Co-instructor');
  }

  // 4. Parse dates, weekday, and time
  const { start, end } = parseDateRange(start_date, end_date);
  const targetWeekday = parseWeekday(weekday);
  const timeObj = parseTime(start_time);

  const matchingDateStrs = getMatchingDates(start, end, targetWeekday);

  // If no matching weekday in range: return empty result rather than an error
  if (matchingDateStrs.length === 0) {
    return {
      created: [],
      skipped: [],
      summary: {
        total: 0,
        created_count: 0,
        skipped_count: 0,
      },
    };
  }

  const created = [];
  const skipped = [];

  for (const dateStr of matchingDateStrs) {
    const startTime = new Date(`${dateStr}T${timeObj.formatted}.000Z`);
    const endTime = computeEndTime(startTime, duration);

    // Rule 3: Check whether an occurrence already exists for same class and exact start_time
    const existingOccurrence = await sessionRepository.findExactOccurrence(cls.id, startTime);
    if (existingOccurrence) {
      skipped.push({
        date: dateStr,
        start_time: startTime.toISOString(),
        reasons: ['ALREADY_EXISTS'],
      });
      continue;
    }

    // Rule 4 & 5: Check room and instructor overlaps across full session interval
    const occurrenceReasons = [];

    const roomConflict = await sessionRepository.findRoomOverlap(room.trim(), startTime, endTime);
    if (roomConflict) {
      occurrenceReasons.push('ROOM_CONFLICT');
    }

    // Check primary instructor
    let instructorConflict = await sessionRepository.findInstructorOverlap(primaryId, startTime, endTime);

    // Check co-instructors if not already conflicted
    if (!instructorConflict && uniqueCoIds.length > 0) {
      for (const coId of uniqueCoIds) {
        const coConflict = await sessionRepository.findInstructorOverlap(coId, startTime, endTime);
        if (coConflict) {
          instructorConflict = true;
          break;
        }
      }
    }

    if (instructorConflict) {
      occurrenceReasons.push('INSTRUCTOR_CONFLICT');
    }

    // If any conflict exists, skip occurrence once with all reasons
    if (occurrenceReasons.length > 0) {
      skipped.push({
        date: dateStr,
        start_time: startTime.toISOString(),
        reasons: occurrenceReasons,
      });
      continue;
    }

    // Rule 7 & 8: Atomic creation per occurrence (partial success)
    const newSession = await sequelize.transaction(async (t) => {
      const sessionRecord = await sessionRepository.create(
        {
          class_id: cls.id,
          room: room.trim(),
          start_time: startTime,
          duration,
          capacity,
          primary_instructor_id: primaryId,
        },
        { transaction: t }
      );

      if (uniqueCoIds.length > 0) {
        await sessionRepository.setCoInstructors(sessionRecord.id, uniqueCoIds, { transaction: t });
      }

      return sessionRepository.findById(sessionRecord.id, { transaction: t });
    });

    created.push(newSession);
  }

  return {
    created,
    skipped,
    summary: {
      total: matchingDateStrs.length,
      created_count: created.length,
      skipped_count: skipped.length,
    },
  };
}

module.exports = {
  computeEndTime,
  validateInstructorAccount,
  validateRoomOverlap,
  validateInstructorOverlap,
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  addCoInstructor,
  removeCoInstructor,
  generateRecurringSchedule,
};
