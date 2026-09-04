'use strict';

const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// Dashboard is protected for STAFF and INSTRUCTOR
router.use(authenticate, authorize('STAFF', 'INSTRUCTOR'));

router.get('/', dashboardController.getDashboard);

module.exports = router;
