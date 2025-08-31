import request from 'supertest';
import { Application } from 'express';
import { createApp } from '@/app';

describe('Authentication Endpoints Structure', () => {
  let app: Application;
  let server: any;

  beforeAll(async () => {
    app = createApp();
    server = app.listen(0); // Use random available port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('API Structure and Validation', () => {
    it('should respond to POST /api/auth/register with proper structure', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          firstName: '',
          lastName: 'Doe',
          password: 'weak',
          confirmPassword: 'different',
        });

      // Should return validation errors with proper structure
      expect(response.status).toBe(400);
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

    it('should validate required fields for registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
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

    it('should respond to POST /api/auth/login with proper validation', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'Email and password are required',
        errors: [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is required' },
        ],
      });
    });

    it('should validate email format for login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'somepassword',
        });

      expect(response.status).toBe(400);
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

    it('should respond to POST /api/auth/refresh with proper validation', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'Refresh token is required',
      });
    });

    it('should respond to POST /api/auth/logout with proper validation', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'Refresh token is required for logout',
      });
    });

    it('should handle invalid refresh tokens properly', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    });

    it('should have all required authentication endpoints', async () => {
      // Test that all endpoints exist and respond (not 404)
      const endpoints = [
        '/api/auth/register',
        '/api/auth/login',
        '/api/auth/refresh',
        '/api/auth/logout',
        '/api/auth/logout-all',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({});

        // Should not be 404 (endpoint exists)
        expect(response.status).not.toBe(404);
        
        // Should have proper error structure
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('API Response Format Consistency', () => {
    it('should maintain consistent response format across endpoints', async () => {
      const endpoints = [
        { path: '/api/auth/register', data: {} },
        { path: '/api/auth/login', data: {} },
        { path: '/api/auth/refresh', data: {} },
        { path: '/api/auth/logout', data: {} },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint.path)
          .send(endpoint.data);

        // All responses should have consistent structure
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.message).toBe('string');
      }
    });

    it('should return proper HTTP status codes', async () => {
      // Test various validation scenarios return 400
      const validationTests = [
        { path: '/api/auth/register', data: { email: 'invalid' } },
        { path: '/api/auth/login', data: { email: 'invalid' } },
        { path: '/api/auth/refresh', data: {} },
        { path: '/api/auth/logout', data: {} },
      ];

      for (const test of validationTests) {
        const response = await request(app)
          .post(test.path)
          .send(test.data);

        expect([400, 401, 500]).toContain(response.status);
      }
    });
  });
});