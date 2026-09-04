'use strict';

const dashboardService = require('../services/dashboard.service');

async function getDashboard(req, res, next) {
  try {
    const result = await dashboardService.getDashboardData(req.user);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
};
