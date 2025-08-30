import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
// import cors from 'cors'; // Unused import removed
import { env } from '@/config/environment';
import { logger } from '@/config/logger';

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (env.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin', { origin });
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Security middleware to add custom security headers
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (env.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /eval\(/i,
    /expression\(/i,
  ];
  
  const checkSuspicious = (obj: any, path = ''): void => {
    if (typeof obj === 'string') {
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(obj)) {
          logger.warn('Suspicious content detected', {
            ip: req.ip,
            path,
            content: obj.substring(0, 100),
            userAgent: req.get('User-Agent'),
            url: req.originalUrl,
          });
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        checkSuspicious(obj[key], `${path}.${key}`);
      });
    }
  };
  
  if (req.body) checkSuspicious(req.body, 'body');
  if (req.query) checkSuspicious(req.query, 'query');
  if (req.params) checkSuspicious(req.params, 'params');
  
  next();
};

// IP whitelist middleware (for admin endpoints)
export const createIPWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP not whitelisted', {
        ip: clientIP,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address',
      });
      return;
    }
    
    next();
  };
};

export default {
  corsOptions,
  helmetConfig,
  securityHeaders,
  sanitizeRequest,
  createIPWhitelist,
};