'use strict';

const { Router } = require('express');
const classController = require('../controllers/class.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

const router = Router();

// All class routes are strictly Staff-only
router.use(authenticate, authorize('STAFF'));

router.post('/', classController.create);
router.put('/:id', classController.update);
router.post('/:id/archive', classController.archive);
router.post('/:id/restore', classController.restore);
router.get('/', classController.list);
router.get('/:id', classController.getById);
router.get('/:id/sessions', classController.getSessions);

module.exports = router;
