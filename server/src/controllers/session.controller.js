'use strict';

const sessionService = require('../services/session.service');

async function create(req, res, next) {
  try {
    const result = await sessionService.createSession(req.body, req.user);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { class_id, from_date, to_date, room } = req.query;
    const result = await sessionService.getAllSessions(
      {
        classId: class_id ? Number(class_id) : null,
        fromDate: from_date || null,
        toDate: to_date || null,
        room: room || null,
      },
      req.user
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.getSessionById(id, req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.updateSession(id, req.body, req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await sessionService.deleteSession(id, req.user);
    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

async function addCoInstructor(req, res, next) {
  try {
    const { id } = req.params;
    const { instructor_id } = req.body;
    const result = await sessionService.addCoInstructor(id, instructor_id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function removeCoInstructor(req, res, next) {
  try {
    const { id, instructorId } = req.params;
    const result = await sessionService.removeCoInstructor(id, instructorId, req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  addCoInstructor,
  removeCoInstructor,
};
