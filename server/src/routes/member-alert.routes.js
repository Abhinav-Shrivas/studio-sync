'use strict';

const express = require('express');
const router = express.Router();
const memberAlertController = require('../controllers/member-alert.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

router.get('/', authenticate, authorize('STAFF'), memberAlertController.getAlerts);
router.post('/:memberId/dismiss', authenticate, authorize('STAFF'), memberAlertController.dismiss);

module.exports = router;
