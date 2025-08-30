import { User } from '@/types/user.types';
import { prisma } from './client';
import { logger } from '@/config/logger';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}

export class UserRepository {
  async create(userData: CreateUserData): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase().trim(),
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
          passwordHash: userData.passwordHash,
        },
      });

      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: userData.email,
      });
      throw new Error('Failed to create user');
    }
  }

  async findById(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      return user;
    } catch (error) {
      logger.error('Failed to find user by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Failed to find user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      return user;
    } catch (error) {
      logger.error('Failed to find user by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw new Error('Failed to find user');
    }
  }

  async update(userId: string, updateData: Partial<User>): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(updateData.email && { email: updateData.email.toLowerCase().trim() }),
          ...(updateData.firstName && { firstName: updateData.firstName.trim() }),
          ...(updateData.lastName && { lastName: updateData.lastName.trim() }),
          ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
          ...(updateData.emailVerified !== undefined && { emailVerified: updateData.emailVerified }),
        },
      });

      logger.info('User updated successfully', {
        userId: user.id,
        updatedFields: Object.keys(updateData),
      });

      return user;
    } catch (error) {
      logger.error('Failed to update user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        updateData: Object.keys(updateData),
      });
      
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        return null;
      }
      
      throw new Error('Failed to update user');
    }
  }

  async delete(userId: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info('User deleted successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return false;
      }
      
      throw new Error('Failed to delete user');
    }
  }

  async count(): Promise<number> {
    try {
      return await prisma.user.count();
    } catch (error) {
      logger.error('Failed to count users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to count users');
    }
  }

  async findActiveUsers(): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to find active users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to find active users');
    }
  }
}