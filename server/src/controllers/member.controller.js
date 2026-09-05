'use strict';

const memberService = require('../services/member.service');

async function getAll(req, res, next) {
  try {
    const result = await memberService.getAllMembers(req.query, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const result = await memberService.getMemberById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await memberService.createMember(req.body, req.user);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await memberService.updateMember(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
};
