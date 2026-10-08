const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

// Public authentication routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
