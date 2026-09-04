'use strict';

const classRepository = require('../repositories/class.repository');
const { toInstructorSessionResponse } = require('./session.service');
const { NotFoundError } = require('../utils/errors');

/**
 * Retrieves all active/non-archived classes in the studio for instructor discovery.
 * Returns instructor-safe fields only (id, title, description, discipline).
 *
 * @returns {Promise<Array<{id: number, title: string, description: string|null, discipline: string}>>}
 */
async function getActiveClassesForInstructor() {
  const classes = await classRepository.findAll({ includeArchived: false });
  return classes.map((cls) => ({
    id: cls.id,
    title: cls.title,
    description: cls.description,
    discipline: cls.discipline,
  }));
}

/**
 * Retrieves sessions for a specific class where the authenticated instructor
 * is either the primary instructor or an assigned co-instructor.
 * Returns 404 if the class does not exist or is archived.
 *
 * @param {number|string} classId - Target class ID
 * @param {object} user - Authenticated instructor context
 * @returns {Promise<Array<object>>} - Array of instructor-safe session projections
 */
async function getInstructorClassSessions(classId, user) {
  const targetClass = await classRepository.findById(classId);
  if (!targetClass || targetClass.is_archived) {
    throw new NotFoundError('Class not found');
  }

  const sessions = await classRepository.getSessions(classId, {
    instructorId: user.id,
  });

  return sessions.map(toInstructorSessionResponse);
}

module.exports = {
  getActiveClassesForInstructor,
  getInstructorClassSessions,
};
