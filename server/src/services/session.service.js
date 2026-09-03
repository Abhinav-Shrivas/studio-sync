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
};
