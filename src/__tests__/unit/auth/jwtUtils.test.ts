import jwt from 'jsonwebtoken';
import {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  extractTokenFromHeader,
} from '@/auth/utils/jwtUtils';

// Mock environment variables
const mockEnv = {
  JWT_SECRET: 'test-jwt-secret',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('JWT Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...mockEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateTokens', () => {
    const userData = {
      userId: 'test-user-id',
      email: 'test@example.com',
    };

    it('should generate both access and refresh tokens', () => {
      const tokens = generateTokens(userData);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should generate valid JWT tokens', () => {
      const tokens = generateTokens(userData);

      // Decode without verification to check structure
      const accessDecoded = jwt.decode(tokens.accessToken) as any;
      const refreshDecoded = jwt.decode(tokens.refreshToken) as any;

      expect(accessDecoded.userId).toBe(userData.userId);
      expect(accessDecoded.email).toBe(userData.email);
      expect(accessDecoded.type).toBe('access');

      expect(refreshDecoded.userId).toBe(userData.userId);
      expect(refreshDecoded.email).toBe(userData.email);
      expect(refreshDecoded.type).toBe('refresh');
    });

    it('should throw error when JWT secrets are missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateTokens(userData)).toThrow('JWT secrets are not configured');
    });

    it('should throw error when JWT refresh secret is missing', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => generateTokens(userData)).toThrow('JWT secrets are not configured');
    });
  });

  describe('verifyAccessToken', () => {
    const userData = {
      userId: 'test-user-id',
      email: 'test@example.com',
    };

    it('should verify and decode valid access token', () => {
      const tokens = generateTokens(userData);
      const decoded = verifyAccessToken(tokens.accessToken);

      expect(decoded.userId).toBe(userData.userId);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow('Invalid access token');
    });

    it('should throw error for refresh token used as access token', () => {
      const tokens = generateTokens(userData);
      expect(() => verifyAccessToken(tokens.refreshToken)).toThrow('Invalid token type');
    });

    it('should throw error when JWT secret is missing', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => verifyAccessToken('any-token')).toThrow('JWT secret is not configured');
    });

    it('should throw error for expired token', () => {
      // Create token with immediate expiry
      const expiredToken = jwt.sign(
        { userId: userData.userId, email: userData.email, type: 'access' },
        mockEnv.JWT_SECRET,
        { expiresIn: '1ms' }
      );

      // Wait for expiry
      setTimeout(() => {
        expect(() => verifyAccessToken(expiredToken)).toThrow('Access token expired');
      }, 10);
    });
  });

  describe('verifyRefreshToken', () => {
    const userData = {
      userId: 'test-user-id',
      email: 'test@example.com',
    };

    it('should verify and decode valid refresh token', () => {
      const tokens = generateTokens(userData);
      const decoded = verifyRefreshToken(tokens.refreshToken);

      expect(decoded.userId).toBe(userData.userId);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow('Invalid refresh token');
    });

    it('should throw error for access token used as refresh token', () => {
      const tokens = generateTokens(userData);
      expect(() => verifyRefreshToken(tokens.accessToken)).toThrow('Invalid token type');
    });

    it('should throw error when JWT refresh secret is missing', () => {
      delete process.env.JWT_REFRESH_SECRET;
      
      expect(() => verifyRefreshToken('any-token')).toThrow('JWT refresh secret is not configured');
    });
  });

  describe('refreshAccessToken', () => {
    const userData = {
      userId: 'test-user-id',
      email: 'test@example.com',
    };

    it('should generate new access token from valid refresh token', () => {
      const tokens = generateTokens(userData);
      const newAccessToken = refreshAccessToken(tokens.refreshToken);

      expect(typeof newAccessToken).toBe('string');
      
      const decoded = verifyAccessToken(newAccessToken);
      expect(decoded.userId).toBe(userData.userId);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.type).toBe('access');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => refreshAccessToken('invalid-token')).toThrow('Invalid refresh token');
    });

    it('should throw error when using access token as refresh token', () => {
      const tokens = generateTokens(userData);
      expect(() => refreshAccessToken(tokens.accessToken)).toThrow('Invalid token type');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const authHeader = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid format (missing Bearer)', () => {
      const extracted = extractTokenFromHeader('token-without-bearer');
      expect(extracted).toBeNull();
    });

    it('should return null for missing token', () => {
      const extracted = extractTokenFromHeader('Bearer ');
      expect(extracted).toBeNull();
    });

    it('should return null for wrong prefix', () => {
      const extracted = extractTokenFromHeader('Basic token-here');
      expect(extracted).toBeNull();
    });

    it('should handle extra spaces correctly', () => {
      const token = 'test-token';
      const authHeader = `Bearer  ${token}`;
      
      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });
  });
});