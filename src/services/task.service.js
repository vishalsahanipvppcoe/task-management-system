const { pool } = require('../config/database');
const { AppError } = require('../middleware/error.middleware');

/**
 * Creates a new task bound strictly to the authenticated user.
 * @param {object} params - { userId, title, description }
 * @returns {Promise<object>} Created task record
 */
const createTask = async ({ userId, title, description }) => {
  const [result] = await pool.execute(
    'INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, ?)',
    [userId, title.trim(), description !== undefined && description !== null ? description.trim() : null, 'Pending']
  );

  const [rows] = await pool.execute(
    'SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?',
    [result.insertId]
  );

  return rows[0];
};

/**
 * Retrieves tasks based on user role.
 * Regular users receive only their own tasks; Admins receive all tasks.
 * @param {object} user - Authenticated user { id, role }
 * @returns {Promise<Array>} List of tasks
 */
const getTasks = async (user) => {
  if (user.role === 'admin') {
    const [rows] = await pool.execute(
      `SELECT t.id, t.user_id, t.title, t.description, t.status, t.created_at, t.updated_at,
              u.name AS user_name, u.email AS user_email
       FROM tasks t
       INNER JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    return rows;
  }

  const [rows] = await pool.execute(
    'SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
    [user.id]
  );
  return rows;
};

/**
 * Retrieves a single task by ID with strict ownership and authorization checks.
 * @param {number|string} taskId
 * @param {object} user - Authenticated user { id, role }
 * @returns {Promise<object>} Task record
 */
const getTaskById = async (taskId, user) => {
  const [rows] = await pool.execute(
    'SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?',
    [taskId]
  );

  if (rows.length === 0) {
    throw new AppError('Task not found', 404);
  }

  const task = rows[0];

  // Authorization check: Admin can view any task; regular user can only view their own
  if (user.role !== 'admin' && task.user_id !== user.id) {
    throw new AppError('You are not authorized to view this task', 403);
  }

  return task;
};

/**
 * Updates a task's title and description.
 * Regular users can only update their own tasks; Admins can update any task.
 * @param {number|string} taskId
 * @param {object} user - Authenticated user { id, role }
 * @param {object} updateData - { title, description }
 * @returns {Promise<object>} Updated task record
 */
const updateTask = async (taskId, user, { title, description }) => {
  const [rows] = await pool.execute(
    'SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?',
    [taskId]
  );

  if (rows.length === 0) {
    throw new AppError('Task not found', 404);
  }

  const task = rows[0];

  // Authorization check: Admin can update any task; regular user can only update their own
  if (user.role !== 'admin' && task.user_id !== user.id) {
    throw new AppError('You are not authorized to update this task', 403);
  }

  const cleanDescription = description !== undefined && description !== null ? description.trim() : null;

  await pool.execute(
    'UPDATE tasks SET title = ?, description = ? WHERE id = ?',
    [title.trim(), cleanDescription, taskId]
  );

  const [updatedRows] = await pool.execute(
    'SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?',
    [taskId]
  );

  return updatedRows[0];
};

/**
 * Updates task status. Strictly restricted to admin users.
 * @param {number|string} taskId
 * @param {object} user - Authenticated user { id, role }
 * @param {string} status - New task status
 * @returns {Promise<object>} Updated task record
 */
const updateTaskStatus = async (taskId, user, status) => {
  if (user.role !== 'admin') {
    throw new AppError('Access denied. Admin role required.', 403);
  }

  const [rows] = await pool.execute(
    'SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?',
    [taskId]
  );

  if (rows.length === 0) {
    throw new AppError('Task not found', 404);
  }

  await pool.execute(
    'UPDATE tasks SET status = ? WHERE id = ?',
    [status, taskId]
  );

  const [updatedRows] = await pool.execute(
    'SELECT id, user_id, title, description, status, created_at, updated_at FROM tasks WHERE id = ?',
    [taskId]
  );

  return updatedRows[0];
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus
};
