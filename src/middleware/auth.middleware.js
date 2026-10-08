const { verifyToken } = require('../utils/jwt');

/**
 * Authentication middleware that verifies JWT in the Authorization header.
 * Attaches decoded user payload { id, role } to req.user upon success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Authorization header must follow Bearer <token> format'
    });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token'
    });
  }
};

module.exports = { authenticate };
