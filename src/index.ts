import { createApp } from './app';
import { env } from './config/environment';

const app = createApp();

const PORT = env.PORT || 3000;
const HOST = env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, server };