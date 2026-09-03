'use strict';

const { Router } = require('express');
const sessionController = require('../controllers/session.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// Staff-only session management routes
router.post('/', authenticate, authorize('STAFF'), sessionController.create);
router.post('/recurring', authenticate, authorize('STAFF'), sessionController.generateRecurring);
router.put('/:id', authenticate, authorize('STAFF'), sessionController.update);
router.delete('/:id', authenticate, authorize('STAFF'), sessionController.remove);

// Co-instructor management (Staff only)
router.post('/:id/co-instructors', authenticate, authorize('STAFF'), sessionController.addCoInstructor);
router.delete('/:id/co-instructors/:instructorId', authenticate, authorize('STAFF'), sessionController.removeCoInstructor);

// Authenticated view routes (Instructors restricted server-side)
router.get('/', authenticate, sessionController.list);
router.get('/:id', authenticate, sessionController.getById);

module.exports = router;
