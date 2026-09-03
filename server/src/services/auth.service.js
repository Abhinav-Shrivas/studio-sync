'use strict';

const userRepository = require('../repositories/user.repository');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Authenticate a user with email and password.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: { id: number, name: string, email: string, role: string } }>}
 * @throws {UnauthorizedError} if credentials are invalid or account is deactivated
 */
async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.is_active) {
    throw new UnauthorizedError('Account is deactivated');
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = generateToken({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

module.exports = { login };
