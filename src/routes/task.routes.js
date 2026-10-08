const express = require('express');
const router = express.Router();

const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema
} = require('../validators/task.validator');

// All task routes require a valid JWT
router.use(authenticate);

// Task CRUD endpoints
router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);

// Admin-only status transition endpoint
router.patch('/:id/status', requireRole('admin'), validate(updateStatusSchema), taskController.updateTaskStatus);

module.exports = router;
