import jwt from 'jsonwebtoken';
import { JWTPayload } from '@/types/auth.types';

interface TokenUser {
  userId: string;
  email: string;
}

interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate both access and refresh tokens for a user
 * @param user - User data to encode in tokens
 * @returns Object containing access and refresh tokens
 */
export const generateTokens = (user: TokenUser): GeneratedTokens => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
  const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets are not configured');
  }

  const accessPayload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    type: 'access',
  };

  const refreshPayload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    type: 'refresh',
  };

  const accessToken = jwt.sign(
    accessPayload,
    jwtSecret,
    {
      expiresIn: accessTokenExpiry,
      issuer: 'aicode-platform',
      audience: 'aicode-users',
    } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    refreshPayload,
    jwtRefreshSecret,
    {
      expiresIn: refreshTokenExpiry,
      issuer: 'aicode-platform',
      audience: 'aicode-users',
    } as jwt.SignOptions
  );

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verify and decode an access token
 * @param token - The JWT token to verify
 * @returns Decoded payload if valid
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT secret is not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: 'aicode-platform',
      audience: 'aicode-users',
    }) as JWTPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired');
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new Error('Access token not active');
    }
    throw error;
  }
};

/**
 * Verify and decode a refresh token
 * @param token - The refresh token to verify
 * @returns Decoded payload if valid
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!jwtRefreshSecret) {
    throw new Error('JWT refresh secret is not configured');
  }

  try {
    const decoded = jwt.verify(token, jwtRefreshSecret, {
      issuer: 'aicode-platform',
      audience: 'aicode-users',
    }) as JWTPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new Error('Refresh token not active');
    }
    throw error;
  }
};

/**
 * Generate a new access token from a valid refresh token
 * @param refreshToken - Valid refresh token
 * @returns New access token
 */
export const refreshAccessToken = (refreshToken: string): string => {
  const refreshPayload = verifyRefreshToken(refreshToken);
  
  const newTokens = generateTokens({
    userId: refreshPayload.userId,
    email: refreshPayload.email,
  });

  return newTokens.accessToken;
};

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const [bearer, token] = authHeader.split(' ');
  
  if (bearer !== 'Bearer' || !token) {
    return null;
  }

  return token;
};