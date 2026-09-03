'use strict';

const { Op, Sequelize } = require('sequelize');
const { Class, Session, User } = require('../models');

/**
 * Class repository — Database access only for classes.
 */

async function create(data, options = {}) {
  return Class.create(data, options);
}

async function findById(id, options = {}) {
  return Class.findByPk(id, options);
}

async function findByTitle(title, options = {}) {
  return Class.findOne({ where: { title }, ...options });
}

async function findAll({ includeArchived = false } = {}, options = {}) {
  const where = {};
  if (!includeArchived) {
    where.is_archived = false;
  }
  return Class.findAll({
    where,
    order: [['title', 'ASC']],
    ...options,
  });
}

async function update(id, data, options = {}) {
  const [affectedRows] = await Class.update(data, {
    where: { id },
    ...options,
  });
  if (affectedRows === 0) {
    return null;
  }
  return findById(id, options);
}

async function getSessions(classId, { instructorId = null } = {}, options = {}) {
  const where = { class_id: classId };

  if (instructorId) {
    where[Op.or] = [
      { primary_instructor_id: instructorId },
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
    order: [['start_time', 'ASC']],
    ...options,
  });
}

module.exports = {
  create,
  findById,
  findByTitle,
  findAll,
  update,
  getSessions,
};
