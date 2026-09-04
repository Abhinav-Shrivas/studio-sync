'use strict';

const memberService = require('../services/member.service');

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
  update,
};
