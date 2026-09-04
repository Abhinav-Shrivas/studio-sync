'use strict';

const memberAlertService = require('../services/member-alert.service');

async function getAlerts(req, res, next) {
  try {
    const result = await memberAlertService.getAlerts();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function dismiss(req, res, next) {
  try {
    const result = await memberAlertService.dismissAlert(req.params.memberId, req.user);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAlerts,
  dismiss,
};
