import request from 'supertest';
import { Application } from 'express';
import { createApp } from '@/app';
import { prisma, disconnectDatabase } from '@/database/client';

describe('Authentication Integration Tests', () => {
  let app: Application;
  let server: any;
  const testUser = {
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
  };

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0); // Use random available port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    // Clean up database connections
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await prisma.user.deleteMany({
        where: {
          email: testUser.email,
        },
      });
    } catch (error) {
      // Ignore errors if table doesn't exist or user not found
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            isActive: true,
            emailVerified: false,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      // Verify user data structure
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user.createdAt).toBeDefined();
      expect(response.body.data.user.updatedAt).toBeDefined();
    });

    it('should return validation errors for invalid input', async () => {
      const invalidUser = {
        email: 'invalid-email',
        firstName: '',
        lastName: 'Doe',
        password: 'weak',
        confirmPassword: 'different',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
      });

      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
          }),
        ])
      );
    });

    it('should prevent duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User with this email already exists',
        errors: [
          {
            field: 'email',
            message: 'Email is already registered',
          },
        ],
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: expect.any(String) }),
          expect.objectContaining({ field: 'firstName', message: expect.any(String) }),
          expect.objectContaining({ field: 'lastName', message: expect.any(String) }),
          expect.objectContaining({ field: 'password', message: expect.any(String) }),
          expect.objectContaining({ field: 'confirmPassword', message: expect.any(String) }),
        ])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid email format',
        errors: [
          {
            field: 'email',
            message: 'Please enter a valid email address',
          },
        ],
      });
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Email and password are required',
        errors: [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is required' },
        ],
      });
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid email or password',
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and login to get refresh token
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      // New tokens should be different from original
      expect(response.body.data.accessToken).not.toBe('');
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Refresh token is required',
      });
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and login to get refresh token
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should logout successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Refresh token is required for logout',
      });
    });

    it('should prevent using refresh token after logout', async () => {
      // Logout first
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // Try to use the same refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full registration -> login -> refresh -> logout flow', async () => {
      // 1. Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);

      // 2. Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      const { refreshToken } = loginResponse.body.data;

      // 3. Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      const newRefreshToken = refreshResponse.body.data.refreshToken;

      // 4. Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // 5. Verify token is invalidated
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(401);
    });
  });
});