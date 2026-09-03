'use strict';

const authService = require('../services/auth.service');
const { ValidationError } = require('../utils/errors');

/**
 * POST /auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      throw new ValidationError('A valid email address is required');
    }

    const result = await authService.login({ email: email.trim(), password });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
