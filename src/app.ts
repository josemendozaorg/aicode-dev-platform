import express, { Application } from 'express';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import 'express-async-errors';

// Import middleware
import { helmetConfig, corsOptions, securityHeaders, sanitizeRequest } from '@/middleware/security';
import { generalLimiter } from '@/middleware/rateLimiter';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

// Import configuration
import { env } from '@/config/environment';
import { logger } from '@/config/logger';

// Import routes
import authRoutes from '@/routes/auth';

export const createApp = (): Application => {
  const app = express();

  // Trust proxy for proper IP detection behind reverse proxy
  app.set('trust proxy', true);

  // Security middleware (should be first)
  app.use(helmetConfig);
  app.use(securityHeaders);

  // CORS
  app.use(cors(corsOptions));

  // Request logging
  if (!env.isTest) {
    app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        },
      },
    }));
  }

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request sanitization
  app.use(sanitizeRequest);

  // Rate limiting
  app.use(generalLimiter);

  // Health check (before authentication)
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      uptime: process.uptime(),
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);

  // Catch 404 errors
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;