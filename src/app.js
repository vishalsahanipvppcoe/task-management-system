const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Task Management API is running'
  });
});

// API route registrations
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// 404 fallback for unhandled routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
