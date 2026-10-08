/**
 * Custom application error class for handling operational HTTP errors.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error-handling middleware.
 * Formats errors into consistent JSON responses and protects internal details.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred';

  // Handle malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body'
    });
  }

  // Hide internal database or low-level server details for unhandled 500 errors
  const clientMessage = statusCode === 500 ? 'Internal server error' : message;

  return res.status(statusCode).json({
    success: false,
    message: clientMessage
  });
};

/**
 * 404 handler for undefined routes.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler
};
