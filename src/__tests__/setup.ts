import 'express-async-errors';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console.log in tests to avoid noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Global test utilities
declare global {
  var testUtils: {
    createMockUser: () => any;
    generateTestToken: () => string;
  };
}

// Test utilities
(global as any).testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  generateTestToken: () => 'mock-jwt-token',
};

// Setup database for tests
beforeAll(async () => {
  // Database initialization will be added here
});

// Clean up after tests
afterAll(async () => {
  // Database cleanup will be added here
});