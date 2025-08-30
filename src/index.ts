import { createApp } from './app';
import { env, validateEnvironment } from '@/config/environment';
import { logger } from '@/config/logger';

// Validate environment variables
try {
  validateEnvironment();
} catch (error) {
  logger.error('Environment validation failed', { error: error instanceof Error ? error.message : error });
  process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections, cleanup, etc.
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Create Express app
const app = createApp();

// Start server
const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`🚀 Server running on ${env.HOST}:${env.PORT}`, {
    environment: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };