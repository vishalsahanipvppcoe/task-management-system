const Joi = require('joi');

const ALLOWED_STATUSES = ['Pending', 'In Progress', 'Testing', 'Completed'];

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'string.base': 'Title must be a string',
    'string.empty': 'Title is required',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title cannot exceed 255 characters',
    'any.required': 'Title is required'
  }),
  description: Joi.string().trim().max(1000).allow('', null).optional().messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description cannot exceed 1000 characters'
  })
}).unknown(false).messages({
  'object.unknown': 'Field {#label} is not allowed'
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required().messages({
    'string.base': 'Title must be a string',
    'string.empty': 'Title is required',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title cannot exceed 255 characters',
    'any.required': 'Title is required'
  }),
  description: Joi.string().trim().max(1000).allow('', null).optional().messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description cannot exceed 1000 characters'
  })
}).unknown(false).messages({
  'object.unknown': 'Field {#label} is not allowed'
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...ALLOWED_STATUSES).required().messages({
    'any.only': `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
    'any.required': 'Status is required'
  })
}).unknown(false).messages({
  'object.unknown': 'Field {#label} is not allowed'
});

module.exports = {
  ALLOWED_STATUSES,
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema
};
