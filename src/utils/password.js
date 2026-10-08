const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcrypt.
 * @param {string} plainTextPassword
 * @returns {Promise<string>}
 */
const hashPassword = async (plainTextPassword) => {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
};

/**
 * Compares a plain text password against a stored hash.
 * @param {string} plainTextPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
const comparePassword = async (plainTextPassword, hashedPassword) => {
  return bcrypt.compare(plainTextPassword, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword
};
