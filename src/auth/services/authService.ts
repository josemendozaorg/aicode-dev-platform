import { LoginRequest, LoginResponse, RefreshTokenResponse, User } from '@/types/user.types';
import { UserService } from './userService';
import { verifyPassword } from '@/auth/utils/passwordUtils';
import { generateTokens, verifyRefreshToken } from '@/auth/utils/jwtUtils';
import { TokenRepository } from '@/database/tokenRepository';

export class AuthService {
  private userService: UserService;
  private tokenRepository: TokenRepository;

  constructor() {
    this.userService = new UserService();
    this.tokenRepository = new TokenRepository();
  }

  async login(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await this.userService.getUserByEmail(loginData.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await verifyPassword(loginData.password, user.passwordHash || '');
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
      });

      // Save refresh token to database
      await this.tokenRepository.saveRefreshToken(user.id, tokens.refreshToken);

      // Return response without password hash
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid email or password' || error.message === 'Account is deactivated') {
          throw error;
        }
      }
      throw new Error('Failed to complete login process');
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // Verify the refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Check if token exists in database
      const tokenRecord = await this.tokenRepository.findRefreshToken(refreshToken);
      if (!tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newTokens = generateTokens({
        userId: payload.userId,
        email: payload.email,
      });

      // Save new refresh token and revoke old one
      await this.tokenRepository.saveRefreshToken(payload.userId, newTokens.refreshToken);
      await this.tokenRepository.revokeRefreshToken(refreshToken);

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('refresh token')) {
        throw error;
      }
      throw new Error('Failed to refresh token');
    }
  }

  async logout(refreshToken: string): Promise<boolean> {
    try {
      const success = await this.tokenRepository.revokeRefreshToken(refreshToken);
      return success;
    } catch (error) {
      throw new Error('Failed to logout user');
    }
  }

  async logoutAllDevices(userId: string): Promise<boolean> {
    try {
      await this.tokenRepository.revokeAllUserTokens(userId);
      return true;
    } catch (error) {
      throw new Error('Failed to logout from all devices');
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    return await this.userService.getUserById(userId);
  }
}