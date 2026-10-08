const { pool } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../middleware/error.middleware');

/**
 * Registers a new regular user.
 * @param {object} userData - { name, email, password }
 * @returns {Promise<object>} Created user record without password
 */
const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user with identical email
  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (existingUsers.length > 0) {
    throw new AppError('Email is already registered', 409);
  }

  // Hash password before saving to database
  const hashedPassword = await hashPassword(password);

  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name.trim(), normalizedEmail, hashedPassword, 'user']
  );

  const [rows] = await pool.execute(
    'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
    [result.insertId]
  );

  return rows[0];
};

/**
 * Authenticates user credentials and issues a JWT.
 * @param {object} credentials - { email, password }
 * @returns {Promise<object>} Auth response with token and public user profile
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const [users] = await pool.execute(
    'SELECT id, name, email, password, role FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (users.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = users[0];
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Minimal token claims as required
  const token = generateToken({
    id: user.id,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

module.exports = {
  registerUser,
  loginUser
};
