'use strict';

const { User } = require('../models');

/**
 * Find a user by email address.
 * @param {string} email
 * @returns {Promise<object|null>} raw Sequelize user instance or null
 */
async function findByEmail(email) {
  return User.findOne({ where: { email } });
}

module.exports = { findByEmail };
