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

/**
 * Find a user by primary key ID.
 * @param {number} id
 * @param {object} options
 * @returns {Promise<object|null>}
 */
async function findById(id, options = {}) {
  return User.findByPk(id, options);
}

module.exports = { findByEmail, findById };

