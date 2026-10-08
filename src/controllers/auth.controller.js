const authService = require('../services/auth.service');

/**
 * Controller to handle user registration.
 */
const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle user login.
 */
const login = async (req, res, next) => {
  try {
    const authData = await authService.loginUser(req.body);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: authData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
