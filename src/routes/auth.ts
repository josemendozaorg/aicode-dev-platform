import express, { Request, Response } from 'express';
import { AuthService } from '@/auth/services/authService';
import { UserService } from '@/auth/services/userService';
import { CreateUserRequest, LoginRequest, RefreshTokenRequest } from '@/types/user.types';
import { validateRegistrationInput } from '@/auth/validators/userRegistration';
import { logger } from '@/config/logger';

const router = express.Router();
const authService = new AuthService();
const userService = new UserService();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;

    // Validate input
    const validation = validateRegistrationInput(userData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Register the user
    const registrationResult = await userService.registerUser(userData);

    logger.info(`User registered successfully: ${userData.email}`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: registrationResult.user,
        accessToken: registrationResult.accessToken,
        refreshToken: registrationResult.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);

    if (error instanceof Error) {
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          errors: [{ field: 'email', message: 'Email is already registered' }],
        });
      }

      if (error.message.startsWith('Validation failed:')) {
        return res.status(400).json({
          success: false,
          message: 'Registration failed',
          error: error.message,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during registration',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequest = req.body;

    // Basic input validation
    if (!loginData.email || !loginData.password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        errors: [
          ...((!loginData.email) ? [{ field: 'email', message: 'Email is required' }] : []),
          ...((!loginData.password) ? [{ field: 'password', message: 'Password is required' }] : []),
        ],
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        errors: [{ field: 'email', message: 'Please enter a valid email address' }],
      });
    }

    // Authenticate user
    const loginResult = await authService.login(loginData);

    logger.info(`User logged in successfully: ${loginData.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: loginResult.user,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid email or password') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      if (error.message === 'Account is deactivated') {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact support.',
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during login',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const tokenResult = await authService.refreshToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);

    if (error instanceof Error && error.message.includes('refresh token')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during token refresh',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required for logout',
      });
    }

    const success = await authService.logout(refreshToken);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to logout. Invalid refresh token.',
      });
    }

    logger.info('User logged out successfully');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during logout',
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout user from all devices by revoking all refresh tokens
 */
router.post('/logout-all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    await authService.logoutAllDevices(userId);

    logger.info(`User logged out from all devices: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    logger.error('Logout all devices error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during logout',
    });
  }
});

export default router;