import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { env } from '@/config/environment';

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Default error response
  let status = error.status || error.statusCode || 500;
  let message = 'Internal server error';
  let code = error.code || 'INTERNAL_ERROR';
  let details = error.details || null;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error.details || error.message;
  } else if (error.name === 'UnauthorizedError' || status === 401) {
    status = 401;
    message = 'Unauthorized access';
    code = 'UNAUTHORIZED';
  } else if (error.name === 'ForbiddenError' || status === 403) {
    status = 403;
    message = 'Access forbidden';
    code = 'FORBIDDEN';
  } else if (error.name === 'NotFoundError' || status === 404) {
    status = 404;
    message = 'Resource not found';
    code = 'NOT_FOUND';
  } else if (error.name === 'ConflictError' || status === 409) {
    status = 409;
    message = 'Resource conflict';
    code = 'CONFLICT';
  } else if (error.name === 'RateLimitError' || status === 429) {
    status = 429;
    message = 'Too many requests';
    code = 'RATE_LIMIT_EXCEEDED';
  } else if (status >= 400 && status < 500) {
    // Client errors - safe to expose message
    message = error.message || message;
  } else if (!env.isProduction && error.message) {
    // Development environment - expose error message
    message = error.message;
  }

  // Send error response
  res.status(status).json({
    success: false,
    error: message,
    code,
    ...(details && { details }),
    ...(env.isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error: CustomError = new Error(`Route ${req.originalUrl} not found`);
  error.status = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create specific error classes
export class ValidationError extends Error {
  status = 400;
  code = 'VALIDATION_ERROR';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  code = 'FORBIDDEN';

  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  code = 'NOT_FOUND';

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  status = 409;
  code = 'CONFLICT';

  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};