'use strict';

const { AppError } = require('../utils/errors');

/**
 * Global error-handling middleware.
 *
 * Catches errors passed via next(err) and returns a consistent JSON response.
 * Known AppError instances use their own statusCode; unexpected errors map to 500.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unexpected / unhandled error
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}

module.exports = errorHandler;
