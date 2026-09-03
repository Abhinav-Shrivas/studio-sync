'use strict';

const classRepository = require('../repositories/class.repository');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

const VALID_DISCIPLINES = [
  'YOGA',
  'MEDITATION',
  'DANCE',
  'PILATES',
  'ZUMBA',
  'STRENGTH',
  'AEROBICS',
  'MARTIAL_ARTS',
];

/**
 * Validate class fields.
 */
function validateClassData({ title, discipline, defaultDuration, defaultCapacity }, isUpdate = false) {
  if (!isUpdate || title !== undefined) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new ValidationError('Class title is required');
    }
  }

  if (!isUpdate || discipline !== undefined) {
    if (!discipline || !VALID_DISCIPLINES.includes(discipline)) {
      throw new ValidationError(
        `Discipline must be one of: ${VALID_DISCIPLINES.join(', ')}`
      );
    }
  }

  if (!isUpdate || defaultDuration !== undefined) {
    const duration = Number(defaultDuration);
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new ValidationError('Default duration must be a positive integer in minutes');
    }
  }

  if (!isUpdate || defaultCapacity !== undefined) {
    const capacity = Number(defaultCapacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new ValidationError('Default capacity must be a positive integer');
    }
  }
}

async function createClass({ title, description, discipline, defaultDuration, defaultCapacity }) {
  validateClassData({ title, discipline, defaultDuration, defaultCapacity }, false);

  const trimmedTitle = title.trim();
  const existing = await classRepository.findByTitle(trimmedTitle);
  if (existing) {
    throw new ConflictError('Class title already exists');
  }

  return classRepository.create({
    title: trimmedTitle,
    description: description ? description.trim() : null,
    discipline,
    default_duration: Number(defaultDuration),
    default_capacity: Number(defaultCapacity),
    is_archived: false,
  });
}

async function getAllClasses({ includeArchived = false, userRole = null } = {}) {
  // Only staff can request archived classes
  const shouldIncludeArchived = userRole === 'STAFF' && Boolean(includeArchived);
  return classRepository.findAll({ includeArchived: shouldIncludeArchived });
}

async function getClassById(id) {
  const cls = await classRepository.findById(id);
  if (!cls) {
    throw new NotFoundError('Class not found');
  }
  return cls;
}

async function updateClass(id, { title, description, discipline, defaultDuration, defaultCapacity }) {
  const cls = await getClassById(id);

  validateClassData({ title, discipline, defaultDuration, defaultCapacity }, true);

  const updateData = {};

  if (title !== undefined) {
    const trimmedTitle = title.trim();
    if (trimmedTitle !== cls.title) {
      const existing = await classRepository.findByTitle(trimmedTitle);
      if (existing && existing.id !== Number(id)) {
        throw new ConflictError('Class title already exists');
      }
      updateData.title = trimmedTitle;
    }
  }

  if (description !== undefined) {
    updateData.description = description ? description.trim() : null;
  }

  if (discipline !== undefined) {
    updateData.discipline = discipline;
  }

  if (defaultDuration !== undefined) {
    updateData.default_duration = Number(defaultDuration);
  }

  if (defaultCapacity !== undefined) {
    updateData.default_capacity = Number(defaultCapacity);
  }

  // Updating class metadata or defaults does not modify existing sessions
  return classRepository.update(id, updateData);
}

async function archiveClass(id) {
  await getClassById(id);
  return classRepository.update(id, { is_archived: true });
}

async function restoreClass(id) {
  await getClassById(id);
  return classRepository.update(id, { is_archived: false });
}

async function getClassSessions(classId, user) {
  await getClassById(classId);

  const instructorId = user && user.role === 'INSTRUCTOR' ? user.id : null;
  return classRepository.getSessions(classId, { instructorId });
}

module.exports = {
  VALID_DISCIPLINES,
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  archiveClass,
  restoreClass,
  getClassSessions,
};
