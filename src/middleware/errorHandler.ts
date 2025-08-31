import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error in development
  if (env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Something went wrong!' : message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};