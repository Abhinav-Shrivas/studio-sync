'use strict';

const { Op } = require('sequelize');
const { Booking, BookingTimeline, Member, Session, Class, User } = require('../models');

const SESSION_INCLUDES = {
  model: Session,
  as: 'session',
  include: [
    {
      model: Class,
      as: 'class',
      attributes: ['id', 'title', 'discipline'],
    },
    {
      model: User,
      as: 'primaryInstructor',
      attributes: ['id', 'name', 'email'],
    },
    {
      model: User,
      as: 'coInstructors',
      attributes: ['id', 'name', 'email'],
      through: { attributes: [] },
    },
  ],
};

const MEMBER_INCLUDES = {
  model: Member,
  as: 'member',
  attributes: ['id', 'name', 'email', 'membership_expiry'],
};

async function create(data, options = {}) {
  return Booking.create(data, options);
}

async function findById(id, options = {}) {
  return Booking.findByPk(Number(id), {
    include: [MEMBER_INCLUDES, SESSION_INCLUDES],
    ...options,
  });
}

async function findByMemberAndSession(memberId, sessionId, options = {}) {
  return Booking.findOne({
    where: {
      member_id: Number(memberId),
      session_id: Number(sessionId),
    },
    ...options,
  });
}

async function findActiveBooking(memberId, sessionId, options = {}) {
  return Booking.findOne({
    where: {
      member_id: Number(memberId),
      session_id: Number(sessionId),
      status: { [Op.in]: ['BOOKED', 'WAITLISTED'] },
    },
    ...options,
  });
}

async function countBooked(sessionId, options = {}) {
  return Booking.count({
    where: {
      session_id: Number(sessionId),
      status: 'BOOKED',
    },
    ...options,
  });
}

async function findEarliestWaitlisted(sessionId, options = {}) {
  return Booking.findOne({
    where: {
      session_id: Number(sessionId),
      status: 'WAITLISTED',
    },
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    ...options,
  });
}

async function update(id, data, options = {}) {
  const booking = await Booking.findByPk(Number(id), options);
  if (!booking) return null;
  return booking.update(data, options);
}

async function createTimelineEntry(data, options = {}) {
  return BookingTimeline.create(data, options);
}

async function getTimeline(bookingId, options = {}) {
  return BookingTimeline.findAll({
    where: { booking_id: Number(bookingId) },
    include: [
      {
        model: User,
        as: 'actor',
        attributes: ['id', 'name', 'email', 'role'],
      },
    ],
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    ...options,
  });
}

/**
 * Find bookings with filters, search, pagination, and sorting.
 * Uses distinct: true and subQuery: false to ensure accurate counts with coInstructors join.
 */
async function findAllAndCount(
  {
    search = null,
    classId = null,
    sessionId = null,
    status = null,
    instructorId = null,
  } = {},
  { order = [['created_at', 'DESC'], ['id', 'DESC']], limit = 10, offset = 0 } = {}
) {
  const where = {};
  const andConditions = [];

  if (status) {
    where.status = status;
  }

  if (sessionId) {
    where.session_id = Number(sessionId);
  }

  if (classId) {
    where['$session.class_id$'] = Number(classId);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    andConditions.push({
      [Op.or]: [
        { '$member.name$': { [Op.iLike]: term } },
        { '$member.email$': { [Op.iLike]: term } },
      ],
    });
  }

  if (instructorId) {
    andConditions.push({
      [Op.or]: [
        { '$session.primary_instructor_id$': Number(instructorId) },
        { '$session.coInstructors.id$': Number(instructorId) },
      ],
    });
  }

  if (andConditions.length > 0) {
    where[Op.and] = andConditions;
  }

  return Booking.findAndCountAll({
    where,
    include: [MEMBER_INCLUDES, SESSION_INCLUDES],
    distinct: true,
    subQuery: false,
    order,
    limit,
    offset,
  });
}

async function findBookingsBySessionId(sessionId, options = {}) {
  return Booking.findAll({
    where: {
      session_id: Number(sessionId),
    },
    include: [MEMBER_INCLUDES],
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
    ...options,
  });
}

module.exports = {
  create,
  findById,
  findByMemberAndSession,
  findActiveBooking,
  countBooked,
  findEarliestWaitlisted,
  update,
  createTimelineEntry,
  getTimeline,
  findAllAndCount,
  findBookingsBySessionId,
};

