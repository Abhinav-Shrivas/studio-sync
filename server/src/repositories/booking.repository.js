'use strict';

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

module.exports = {
  create,
  findById,
  findByMemberAndSession,
  countBooked,
  findEarliestWaitlisted,
  update,
  createTimelineEntry,
  getTimeline,
};
