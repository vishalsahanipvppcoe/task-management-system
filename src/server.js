require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  try {
    // Verify database connectivity before accepting incoming traffic
    await testConnection();
    console.log('[Database] MySQL connection pool initialized successfully.');

    const server = app.listen(PORT, () => {
      console.log(`[Server] Kaniska Task Management API running on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    const handleShutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Failed to connect to MySQL database:', error.message);
    process.exit(1);
  }
}

startServer();
