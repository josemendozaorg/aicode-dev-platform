import { prisma } from './client';
import { logger } from '@/config/logger';

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export class TokenRepository {
  async saveRefreshToken(userId: string, token: string, expiresAt?: Date): Promise<boolean> {
    try {
      // Default expiration: 7 days from now
      const expiration = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          token,
          userId,
          expiresAt: expiration,
        },
      });

      logger.info('Refresh token saved successfully', {
        userId,
        expiresAt: expiration,
      });

      return true;
    } catch (error) {
      logger.error('Failed to save refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Failed to save refresh token');
    }
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    try {
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { 
          token,
        },
      });

      // Check if token is valid (not revoked and not expired)
      if (refreshToken && !refreshToken.isRevoked && refreshToken.expiresAt > new Date()) {
        return refreshToken;
      }

      return null;
    } catch (error) {
      logger.error('Failed to find refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to find refresh token');
    }
  }

  async revokeRefreshToken(token: string): Promise<boolean> {
    try {
      const result = await prisma.refreshToken.updateMany({
        where: { 
          token,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      logger.info('Refresh token revoked', {
        token: token.substring(0, 10) + '...',
        tokensRevoked: result.count,
      });

      return result.count > 0;
    } catch (error) {
      logger.error('Failed to revoke refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to revoke refresh token');
    }
  }

  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      const result = await prisma.refreshToken.updateMany({
        where: { 
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      logger.info('All user tokens revoked', {
        userId,
        tokensRevoked: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to revoke all user tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Failed to revoke all user tokens');
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });

      logger.info('Expired tokens cleaned up', {
        tokensDeleted: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to cleanup expired tokens');
    }
  }

  async getUserTokenCount(userId: string): Promise<number> {
    try {
      return await prisma.refreshToken.count({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });
    } catch (error) {
      logger.error('Failed to get user token count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Failed to get user token count');
    }
  }

  async getTokenMetrics(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    revokedTokens: number;
  }> {
    try {
      const [totalTokens, activeTokens, expiredTokens, revokedTokens] = await Promise.all([
        prisma.refreshToken.count(),
        prisma.refreshToken.count({
          where: {
            isRevoked: false,
            expiresAt: { gt: new Date() },
          },
        }),
        prisma.refreshToken.count({
          where: {
            isRevoked: false,
            expiresAt: { lte: new Date() },
          },
        }),
        prisma.refreshToken.count({
          where: { isRevoked: true },
        }),
      ]);

      return { totalTokens, activeTokens, expiredTokens, revokedTokens };
    } catch (error) {
      logger.error('Failed to get token metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get token metrics');
    }
  }
}