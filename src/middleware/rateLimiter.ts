import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '@/config/environment';
import { logger } from '@/config/logger';

export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || env.RATE_LIMIT_WINDOW_MS,
    max: options?.max || env.RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      error: options?.message || 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((options?.windowMs || env.RATE_LIMIT_WINDOW_MS) / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
      });
      
      res.status(429).json({
        success: false,
        error: options?.message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((options?.windowMs || env.RATE_LIMIT_WINDOW_MS) / 1000),
      });
    },
  });
};

// General rate limiter
export const generalLimiter = createRateLimiter();

// Strict rate limiter for sensitive endpoints
export const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many attempts, please try again later.',
});

// Auth rate limiter for login/register endpoints
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

export default {
  generalLimiter,
  strictLimiter,
  authLimiter,
  createRateLimiter,
};