'use strict';

const classService = require('../services/class.service');

async function create(req, res, next) {
  try {
    const { title, description, discipline, default_duration, default_capacity } = req.body;
    const result = await classService.createClass({
      title,
      description,
      discipline,
      defaultDuration: default_duration,
      defaultCapacity: default_capacity,
    });
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
    const includeArchived = req.query.include_archived === 'true';
    const result = await classService.getAllClasses({
      includeArchived,
      userRole: req.user ? req.user.role : null,
    });
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
    const result = await classService.getClassById(id);
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
    const { title, description, discipline, default_duration, default_capacity } = req.body;
    const result = await classService.updateClass(id, {
      title,
      description,
      discipline,
      defaultDuration: default_duration,
      defaultCapacity: default_capacity,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function archive(req, res, next) {
  try {
    const { id } = req.params;
    const result = await classService.archiveClass(id);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function restore(req, res, next) {
  try {
    const { id } = req.params;
    const result = await classService.restoreClass(id);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getSessions(req, res, next) {
  try {
    const { id } = req.params;
    const result = await classService.getClassSessions(id, req.user);
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
  archive,
  restore,
  getSessions,
};
