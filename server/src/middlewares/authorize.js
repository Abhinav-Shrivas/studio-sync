'use strict';

/**
 * Role-based authorization middleware factory.
 *
 * Usage:
 *   authorize('STAFF')
 *   authorize('STAFF', 'INSTRUCTOR')
 *
 * Must be used AFTER the authenticate middleware, which populates req.user.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
}

module.exports = authorize;
