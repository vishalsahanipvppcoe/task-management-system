/**
 * Middleware factory for role-based authorization.
 * Allows access only if the authenticated user's role matches any of the specified roles.
 * @param  {...string} roles - Permitted roles (e.g. 'admin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { requireRole };
