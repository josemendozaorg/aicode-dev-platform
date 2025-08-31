import { UserService } from '@/auth/services/userService';
import { CreateUserRequest, User } from '@/types/user.types';

// Mock dependencies
jest.mock('@/database/userRepository');
jest.mock('@/auth/utils/passwordUtils');
jest.mock('@/auth/utils/jwtUtils');

import { UserRepository } from '@/database/userRepository';
import { hashPassword } from '@/auth/utils/passwordUtils';
import { generateTokens } from '@/auth/utils/jwtUtils';

// Create mock instances
const mockUserRepositoryInstance = {
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findActiveUsers: jest.fn(),
};

const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockGenerateTokens = generateTokens as jest.MockedFunction<typeof generateTokens>;

// Mock the UserRepository constructor
(UserRepository as jest.Mock).mockImplementation(() => mockUserRepositoryInstance);

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validRegistrationData: CreateUserRequest = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
    };

    it('should successfully register a new user', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      const mockUser: User = {
        id: 'user-id',
        email: validRegistrationData.email,
        firstName: validRegistrationData.firstName,
        lastName: validRegistrationData.lastName,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockUserRepositoryInstance.findByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockUserRepositoryInstance.create.mockResolvedValue(mockUser);
      mockGenerateTokens.mockReturnValue(mockTokens);

      // Act
      const result = await userService.registerUser(validRegistrationData);

      // Assert
      expect(mockUserRepositoryInstance.findByEmail).toHaveBeenCalledWith(validRegistrationData.email);
      expect(mockHashPassword).toHaveBeenCalledWith(validRegistrationData.password);
      expect(mockUserRepositoryInstance.create).toHaveBeenCalledWith({
        email: validRegistrationData.email,
        firstName: validRegistrationData.firstName,
        lastName: validRegistrationData.lastName,
        passwordHash: hashedPassword,
      });
      expect(mockGenerateTokens).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });

      expect(result).toEqual({
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const existingUser: User = {
        id: 'existing-user-id',
        email: validRegistrationData.email,
        firstName: 'Existing',
        lastName: 'User',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepositoryInstance.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.registerUser(validRegistrationData))
        .rejects
        .toThrow('User with this email already exists');

      expect(mockUserRepositoryInstance.findByEmail).toHaveBeenCalledWith(validRegistrationData.email);
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockUserRepositoryInstance.create).not.toHaveBeenCalled();
    });

    it('should throw error if password hashing fails', async () => {
      // Arrange
      mockUserRepositoryInstance.findByEmail.mockResolvedValue(null);
      mockHashPassword.mockRejectedValue(new Error('Hashing failed'));

      // Act & Assert
      await expect(userService.registerUser(validRegistrationData))
        .rejects
        .toThrow('Failed to process user registration');

      expect(mockUserRepositoryInstance.findByEmail).toHaveBeenCalledWith(validRegistrationData.email);
      expect(mockHashPassword).toHaveBeenCalledWith(validRegistrationData.password);
      expect(mockUserRepositoryInstance.create).not.toHaveBeenCalled();
    });

    it('should throw error if user creation fails', async () => {
      // Arrange
      const hashedPassword = 'hashed-password';
      
      mockUserRepositoryInstance.findByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue(hashedPassword);
      mockUserRepositoryInstance.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(userService.registerUser(validRegistrationData))
        .rejects
        .toThrow('Failed to create user account');

      expect(mockUserRepositoryInstance.findByEmail).toHaveBeenCalledWith(validRegistrationData.email);
      expect(mockHashPassword).toHaveBeenCalledWith(validRegistrationData.password);
      expect(mockUserRepositoryInstance.create).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-id';
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepositoryInstance.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(mockUserRepositoryInstance.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      mockUserRepositoryInstance.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(mockUserRepositoryInstance.findById).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser: User = {
        id: 'user-id',
        email,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepositoryInstance.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(mockUserRepositoryInstance.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      mockUserRepositoryInstance.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(mockUserRepositoryInstance.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toBeNull();
    });
  });
});