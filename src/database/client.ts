import { PrismaClient } from '@prisma/client';
import { env } from '@/config/environment';
import { logger } from '@/config/logger';

// Prisma client singleton
let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

if (env.isProduction) {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'minimal',
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: env.isDevelopment 
        ? ['query', 'info', 'warn', 'error']
        : ['error', 'warn'],
      errorFormat: 'colorless',
    });
  }
  prisma = global.__prisma;
}

// Connection management
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection test successful');
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to connect to database');
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Database disconnection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};

// Database metrics
export const getDatabaseMetrics = async (): Promise<{
  userCount: number;
  activeTokens: number;
  auditLogCount: number;
}> => {
  try {
    const [userCount, activeTokens, auditLogCount] = await Promise.all([
      prisma.user.count(),
      prisma.refreshToken.count({ where: { isRevoked: false } }),
      prisma.auditLog.count(),
    ]);

    return { userCount, activeTokens, auditLogCount };
  } catch (error) {
    logger.error('Failed to get database metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to get database metrics');
  }
};

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

export { prisma };
export default prisma;