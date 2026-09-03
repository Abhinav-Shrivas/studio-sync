'use strict';

const { Op, Sequelize } = require('sequelize');
const { Session, Class, User, SessionCoInstructor, Booking } = require('../models');

/**
 * Session repository — Database access only for sessions and co-instructors.
 */

async function create(sessionData, options = {}) {
  return Session.create(sessionData, options);
}

async function findById(id, options = {}) {
  return Session.findByPk(id, {
    include: [
      {
        model: Class,
        as: 'class',
      },
      {
        model: User,
        as: 'primaryInstructor',
        attributes: ['id', 'name', 'email', 'role', 'is_active'],
      },
      {
        model: User,
        as: 'coInstructors',
        attributes: ['id', 'name', 'email', 'role', 'is_active'],
        through: { attributes: [] },
      },
    ],
    ...options,
  });
}

async function findAll({ classId = null, instructorId = null, fromDate = null, toDate = null, room = null } = {}, options = {}) {
  const where = {};

  if (classId) {
    where.class_id = classId;
  }

  if (room) {
    where.room = room;
  }

  if (fromDate || toDate) {
    where.start_time = {};
    if (fromDate) {
      where.start_time[Op.gte] = new Date(fromDate);
    }
    if (toDate) {
      where.start_time[Op.lte] = new Date(toDate);
    }
  }

  if (instructorId) {
    where[Op.or] = [
      { primary_instructor_id: Number(instructorId) },
      Sequelize.literal(`EXISTS (
        SELECT 1 FROM "session_co_instructors" AS "sci"
        WHERE "sci"."session_id" = "Session"."id"
          AND "sci"."instructor_id" = ${Number(instructorId)}
      )`),
    ];
  }

  return Session.findAll({
    where,
    include: [
      {
        model: Class,
        as: 'class',
      },
      {
        model: User,
        as: 'primaryInstructor',
        attributes: ['id', 'name', 'email', 'role', 'is_active'],
      },
      {
        model: User,
        as: 'coInstructors',
        attributes: ['id', 'name', 'email', 'role', 'is_active'],
        through: { attributes: [] },
      },
    ],
    order: [['start_time', 'ASC']],
    ...options,
  });
}

async function update(id, sessionData, options = {}) {
  const [affectedRows] = await Session.update(sessionData, {
    where: { id },
    ...options,
  });
  if (affectedRows === 0) {
    return null;
  }
  return findById(id, options);
}

async function remove(id, options = {}) {
  return Session.destroy({
    where: { id },
    ...options,
  });
}

async function addCoInstructor(sessionId, instructorId, options = {}) {
  return SessionCoInstructor.create(
    {
      session_id: sessionId,
      instructor_id: instructorId,
    },
    options
  );
}

async function removeCoInstructor(sessionId, instructorId, options = {}) {
  return SessionCoInstructor.destroy({
    where: {
      session_id: sessionId,
      instructor_id: instructorId,
    },
    ...options,
  });
}

async function setCoInstructors(sessionId, instructorIds, options = {}) {
  await SessionCoInstructor.destroy({
    where: { session_id: sessionId },
    ...options,
  });

  if (instructorIds && instructorIds.length > 0) {
    const rows = instructorIds.map((id) => ({
      session_id: sessionId,
      instructor_id: id,
    }));
    await SessionCoInstructor.bulkCreate(rows, options);
  }
}

async function getCoInstructorIds(sessionId, options = {}) {
  const records = await SessionCoInstructor.findAll({
    where: { session_id: sessionId },
    attributes: ['instructor_id'],
    raw: true,
    ...options,
  });
  return records.map((r) => r.instructor_id);
}

async function countBookingsBySession(sessionId, options = {}) {
  return Booking.count({
    where: { session_id: sessionId },
    ...options,
  });
}

async function countBookedMembers(sessionId, options = {}) {
  return Booking.count({
    where: {
      session_id: sessionId,
      status: 'BOOKED',
    },
    ...options,
  });
}

async function findRoomOverlap(room, startTime, endTime, excludeSessionId = null, options = {}) {
  const startIso = new Date(startTime).toISOString();
  const endIso = new Date(endTime).toISOString();

  const where = {
    room,
    start_time: { [Op.lt]: new Date(endIso) },
    [Op.and]: [
      Sequelize.literal(`("Session"."start_time" + ("Session"."duration" * INTERVAL '1 minute')) > '${startIso}'::timestamptz`),
    ],
  };

  if (excludeSessionId) {
    where.id = { [Op.ne]: Number(excludeSessionId) };
  }

  return Session.findOne({
    where,
    ...options,
  });
}

async function findInstructorOverlap(instructorId, startTime, endTime, excludeSessionId = null, options = {}) {
  const startIso = new Date(startTime).toISOString();
  const endIso = new Date(endTime).toISOString();
  const numericId = Number(instructorId);

  const where = {
    start_time: { [Op.lt]: new Date(endIso) },
    [Op.and]: [
      Sequelize.literal(`("Session"."start_time" + ("Session"."duration" * INTERVAL '1 minute')) > '${startIso}'::timestamptz`),
      {
        [Op.or]: [
          { primary_instructor_id: numericId },
          Sequelize.literal(`EXISTS (
            SELECT 1 FROM "session_co_instructors" AS "sci"
            WHERE "sci"."session_id" = "Session"."id"
              AND "sci"."instructor_id" = ${numericId}
          )`),
        ],
      },
    ],
  };

  if (excludeSessionId) {
    where.id = { [Op.ne]: Number(excludeSessionId) };
  }

  return Session.findOne({
    where,
    ...options,
  });
}

async function findExactOccurrence(classId, startTime, options = {}) {
  return Session.findOne({
    where: {
      class_id: Number(classId),
      start_time: new Date(startTime),
    },
    ...options,
  });
}

module.exports = {
  create,
  findById,
  findAll,
  update,
  remove,
  addCoInstructor,
  removeCoInstructor,
  setCoInstructors,
  getCoInstructorIds,
  countBookingsBySession,
  countBookedMembers,
  findRoomOverlap,
  findInstructorOverlap,
  findExactOccurrence,
};
