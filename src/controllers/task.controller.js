const taskService = require('../services/task.service');

/**
 * Controller to handle task creation.
 */
const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask({
      userId: req.user.id,
      title: req.body.title,
      description: req.body.description
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to retrieve all accessible tasks.
 */
const getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasks(req.user);

    return res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to retrieve a single task by ID.
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update task details (title, description).
 */
const updateTask = async (req, res, next) => {
  try {
    const updatedTask = await taskService.updateTask(req.params.id, req.user, req.body);

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update task status (Admin only).
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const updatedTask = await taskService.updateTaskStatus(req.params.id, req.user, req.body.status);

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus
};
