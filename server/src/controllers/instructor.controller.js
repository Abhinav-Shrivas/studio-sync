'use strict';

const instructorService = require('../services/instructor.service');

async function listClasses(req, res, next) {
  try {
    const result = await instructorService.getActiveClassesForInstructor();
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function listClassSessions(req, res, next) {
  try {
    const { classId } = req.params;
    const result = await instructorService.getInstructorClassSessions(classId, req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listClasses,
  listClassSessions,
};
