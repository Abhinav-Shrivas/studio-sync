'use strict';

const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

router.get('/', authenticate, authorize('STAFF'), memberController.getAll);
router.get('/:id', authenticate, authorize('STAFF'), memberController.getById);
router.post('/', authenticate, authorize('STAFF'), memberController.create);
router.patch('/:id', authenticate, authorize('STAFF'), memberController.update);

module.exports = router;
