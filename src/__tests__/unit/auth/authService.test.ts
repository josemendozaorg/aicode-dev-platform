import { AuthService } from '@/auth/services/authService';
import { LoginRequest, User } from '@/types/user.types';

// Mock dependencies
jest.mock('@/auth/services/userService');
jest.mock('@/auth/utils/passwordUtils');
jest.mock('@/auth/utils/jwtUtils');
jest.mock('@/database/tokenRepository');

import { UserService } from '@/auth/services/userService';
import { verifyPassword } from '@/auth/utils/passwordUtils';
import { generateTokens, verifyRefreshToken } from '@/auth/utils/jwtUtils';
import { TokenRepository } from '@/database/tokenRepository';

const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;
const mockGenerateTokens = generateTokens as jest.MockedFunction<typeof generateTokens>;
const mockVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<typeof verifyRefreshToken>;
const mockTokenRepository = TokenRepository as jest.Mocked<typeof TokenRepository>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserServiceInstance: any;
  let mockTokenRepositoryInstance: any;

  beforeEach(() => {
    mockUserServiceInstance = {
      getUserByEmail: jest.fn(),
    };
    mockTokenRepositoryInstance = {
      saveRefreshToken: jest.fn(),
      findRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    mockUserService.mockImplementation(() => mockUserServiceInstance);
    mockTokenRepository.mockImplementation(() => mockTokenRepositoryInstance);

    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginData: LoginRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    const mockUser: User = {
      id: 'user-id',
      email: loginData.email,
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hashed-password',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockGenerateTokens.mockReturnValue(mockTokens);
      mockTokenRepositoryInstance.saveRefreshToken.mockResolvedValue(true);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(mockUserServiceInstance.getUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockVerifyPassword).toHaveBeenCalledWith(loginData.password, mockUser.passwordHash);
      expect(mockGenerateTokens).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(mockTokenRepositoryInstance.saveRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        mockTokens.refreshToken
      );

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          isActive: mockUser.isActive,
          emailVerified: mockUser.emailVerified,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      mockUserServiceInstance.getUserByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');

      expect(mockUserServiceInstance.getUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockVerifyPassword).not.toHaveBeenCalled();
      expect(mockGenerateTokens).not.toHaveBeenCalled();
    });

    it('should throw error for incorrect password', async () => {
      // Arrange
      mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Invalid email or password');

      expect(mockUserServiceInstance.getUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockVerifyPassword).toHaveBeenCalledWith(loginData.password, mockUser.passwordHash);
      expect(mockGenerateTokens).not.toHaveBeenCalled();
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserServiceInstance.getUserByEmail.mockResolvedValue(inactiveUser);
      mockVerifyPassword.mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Account is deactivated');

      expect(mockUserServiceInstance.getUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockVerifyPassword).toHaveBeenCalledWith(loginData.password, inactiveUser.passwordHash);
      expect(mockGenerateTokens).not.toHaveBeenCalled();
    });

    it('should throw error when token saving fails', async () => {
      // Arrange
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockUserServiceInstance.getUserByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockGenerateTokens.mockReturnValue(mockTokens);
      mockTokenRepositoryInstance.saveRefreshToken.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Failed to complete login process');

      expect(mockTokenRepositoryInstance.saveRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        mockTokens.refreshToken
      );
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        type: 'refresh' as const,
      };
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockVerifyRefreshToken.mockReturnValue(mockPayload);
      mockTokenRepositoryInstance.findRefreshToken.mockResolvedValue({
        id: 'token-id',
        userId: mockPayload.userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      mockGenerateTokens.mockReturnValue(newTokens);
      mockTokenRepositoryInstance.saveRefreshToken.mockResolvedValue(true);

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(mockVerifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockTokenRepositoryInstance.findRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockGenerateTokens).toHaveBeenCalledWith({
        userId: mockPayload.userId,
        email: mockPayload.email,
      });
      expect(mockTokenRepositoryInstance.saveRefreshToken).toHaveBeenCalledWith(
        mockPayload.userId,
        newTokens.refreshToken
      );

      expect(result).toEqual({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      const invalidToken = 'invalid-refresh-token';
      mockVerifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      // Act & Assert
      await expect(authService.refreshToken(invalidToken)).rejects.toThrow('Invalid refresh token');

      expect(mockVerifyRefreshToken).toHaveBeenCalledWith(invalidToken);
      expect(mockTokenRepositoryInstance.findRefreshToken).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent refresh token in database', async () => {
      // Arrange
      const refreshToken = 'non-existent-token';
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        type: 'refresh' as const,
      };

      mockVerifyRefreshToken.mockReturnValue(mockPayload);
      mockTokenRepositoryInstance.findRefreshToken.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');

      expect(mockTokenRepositoryInstance.findRefreshToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      mockTokenRepositoryInstance.revokeRefreshToken.mockResolvedValue(true);

      // Act
      const result = await authService.logout(refreshToken);

      // Assert
      expect(mockTokenRepositoryInstance.revokeRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toBe(true);
    });

    it('should handle logout when token does not exist', async () => {
      // Arrange
      const refreshToken = 'non-existent-token';
      mockTokenRepositoryInstance.revokeRefreshToken.mockResolvedValue(false);

      // Act
      const result = await authService.logout(refreshToken);

      // Assert
      expect(mockTokenRepositoryInstance.revokeRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toBe(false);
    });

    it('should handle database errors during logout', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      mockTokenRepositoryInstance.revokeRefreshToken.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.logout(refreshToken)).rejects.toThrow('Failed to logout user');

      expect(mockTokenRepositoryInstance.revokeRefreshToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('logoutAllDevices', () => {
    it('should revoke all user tokens successfully', async () => {
      // Arrange
      const userId = 'user-id';
      mockTokenRepositoryInstance.revokeAllUserTokens.mockResolvedValue(5); // 5 tokens revoked

      // Act
      const result = await authService.logoutAllDevices(userId);

      // Assert
      expect(mockTokenRepositoryInstance.revokeAllUserTokens).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    it('should handle case when no tokens exist', async () => {
      // Arrange
      const userId = 'user-id';
      mockTokenRepositoryInstance.revokeAllUserTokens.mockResolvedValue(0); // 0 tokens revoked

      // Act
      const result = await authService.logoutAllDevices(userId);

      // Assert
      expect(mockTokenRepositoryInstance.revokeAllUserTokens).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    it('should handle database errors during logout all devices', async () => {
      // Arrange
      const userId = 'user-id';
      mockTokenRepositoryInstance.revokeAllUserTokens.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(authService.logoutAllDevices(userId)).rejects.toThrow('Failed to logout from all devices');

      expect(mockTokenRepositoryInstance.revokeAllUserTokens).toHaveBeenCalledWith(userId);
    });
  });
});