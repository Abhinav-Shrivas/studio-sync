'use strict';

const bcrypt = require('bcryptjs');

/**
 * Compare a plaintext password against a bcrypt hash.
 * @param {string} password - plaintext password
 * @param {string} hash - bcrypt hash
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { comparePassword };
