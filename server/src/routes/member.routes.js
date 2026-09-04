'use strict';

const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

router.patch('/:id', authenticate, authorize('STAFF'), memberController.update);

module.exports = router;
