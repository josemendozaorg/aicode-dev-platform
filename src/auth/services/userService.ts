import { CreateUserRequest, User, UserRegistrationResponse } from '@/types/user.types';
import { UserRepository } from '@/database/userRepository';
import { hashPassword } from '@/auth/utils/passwordUtils';
import { generateTokens } from '@/auth/utils/jwtUtils';
import { validateRegistrationInput } from '@/auth/validators/userRegistration';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async registerUser(userData: CreateUserRequest): Promise<UserRegistrationResponse> {
    try {
      // Validate input
      const validation = validateRegistrationInput(userData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash the password
      const passwordHash = await hashPassword(userData.password);

      // Create the user
      const user = await this.userRepository.create({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
      });

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
      });

      return {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User with this email already exists') {
          throw error;
        }
        if (error.message.startsWith('Validation failed:')) {
          throw error;
        }
        if (error.message.includes('Hash') || error.message.includes('password')) {
          throw new Error('Failed to process user registration');
        }
        if (error.message.includes('Database') || error.message.includes('create')) {
          throw new Error('Failed to create user account');
        }
      }
      throw new Error('An unexpected error occurred during registration');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    return await this.userRepository.update(userId, updateData);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return await this.userRepository.delete(userId);
  }
}