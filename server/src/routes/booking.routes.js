'use strict';

const { Router } = require('express');
const bookingController = require('../controllers/booking.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// Staff-only booking management routes
router.post('/', authenticate, authorize('STAFF'), bookingController.create);
router.post('/:id/cancel', authenticate, authorize('STAFF'), bookingController.cancel);

// Attendance settlement: Staff for any session; Instructors for assigned sessions
router.post('/:id/settle', authenticate, bookingController.settle);

// Timeline routes: Staff only (Instructors rejected with 403)
router.get('/:id/timeline', authenticate, authorize('STAFF'), bookingController.getTimeline);
router.post('/:id/timeline/notes', authenticate, authorize('STAFF'), bookingController.addNote);

// View booking details (Authenticated; Instructors limited to assigned sessions)
router.get('/:id', authenticate, bookingController.getById);

module.exports = router;
