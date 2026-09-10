const app = require('./src/app');
const env = require('./src/config/env');
const { closePool } = require('./src/config/database');

const server = app.listen(env.PORT, () => {
  console.log(`🚀 PlaySphere Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// Graceful Shutdown Handlers
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('HTTP server closed.');
    await closePool();
    process.exit(0);
  });

  // Force close if it takes too long
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Do not exit in development, but you might want to in production
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});
