const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Generates a signed JWT with minimal required claims.
 * @param {object} payload - Minimal claims { id, role }
 * @returns {string} - Signed JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws an error if token is invalid or expired.
 * @param {string} token
 * @returns {object} - Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
