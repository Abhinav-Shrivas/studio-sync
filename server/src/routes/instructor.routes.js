'use strict';

const { Router } = require('express');
const instructorController = require('../controllers/instructor.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// All instructor discovery routes require INSTRUCTOR role
router.use(authenticate, authorize('INSTRUCTOR'));

router.get('/classes', instructorController.listClasses);
router.get('/classes/:classId/sessions', instructorController.listClassSessions);

module.exports = router;
