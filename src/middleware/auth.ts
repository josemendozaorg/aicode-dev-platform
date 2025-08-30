import { Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '@/auth/utils/jwtUtils';
import { AuthRequest } from '@/types/auth.types';
import { logger } from '@/config/logger';

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }
    
    const decoded = verifyAccessToken(token);
    
    // Add user information to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    
    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
    });
    
    if (error instanceof Error) {
      if (error.message === 'Access token expired') {
        res.status(401).json({
          success: false,
          error: 'Access token expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      
      if (error.message === 'Invalid access token') {
        res.status(401).json({
          success: false,
          error: 'Invalid access token',
          code: 'INVALID_TOKEN',
        });
        return;
      }
    }
    
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
        };
      } catch (error) {
        // Token exists but is invalid/expired - continue without auth
        logger.debug('Optional auth failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: req.ip,
        });
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

export const requireRole = (_roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }
    
    // TODO: Implement role checking when user roles are added
    // For now, all authenticated users pass
    next();
  };
};

export const requireEmailVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  
  // TODO: Check if user's email is verified
  // For now, all authenticated users pass
  next();
};

export default {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireEmailVerification,
};