import { validateRegistrationInput } from '@/auth/validators/userRegistration';
import { CreateUserRequest } from '@/types/user.types';

describe('User Registration Validation', () => {
  describe('validateRegistrationInput', () => {
    const validInput: CreateUserRequest = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
    };

    it('should pass validation with valid input', () => {
      const result = validateRegistrationInput(validInput);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('email validation', () => {
      it('should reject empty email', () => {
        const input = { ...validInput, email: '' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email is required'
        });
      });

      it('should reject invalid email format', () => {
        const input = { ...validInput, email: 'invalid-email' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Invalid email format'
        });
      });

      it('should reject email longer than 254 characters', () => {
        const longEmail = 'a'.repeat(240) + '@example.com';
        const input = { ...validInput, email: longEmail };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'email',
          message: 'Email must be 254 characters or less'
        });
      });
    });

    describe('firstName validation', () => {
      it('should reject empty firstName', () => {
        const input = { ...validInput, firstName: '' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'firstName',
          message: 'First name is required'
        });
      });

      it('should reject firstName longer than 50 characters', () => {
        const input = { ...validInput, firstName: 'a'.repeat(51) };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'firstName',
          message: 'First name must be 50 characters or less'
        });
      });

      it('should reject firstName with invalid characters', () => {
        const input = { ...validInput, firstName: 'John123' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'firstName',
          message: 'First name can only contain letters, spaces, hyphens, and apostrophes'
        });
      });
    });

    describe('lastName validation', () => {
      it('should reject empty lastName', () => {
        const input = { ...validInput, lastName: '' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lastName',
          message: 'Last name is required'
        });
      });

      it('should reject lastName longer than 50 characters', () => {
        const input = { ...validInput, lastName: 'a'.repeat(51) };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'lastName',
          message: 'Last name must be 50 characters or less'
        });
      });
    });

    describe('password validation', () => {
      it('should reject empty password', () => {
        const input = { ...validInput, password: '', confirmPassword: '' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password is required'
        });
      });

      it('should reject password shorter than 8 characters', () => {
        const input = { ...validInput, password: 'Short1!', confirmPassword: 'Short1!' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password must be at least 8 characters long'
        });
      });

      it('should reject password without uppercase letter', () => {
        const input = { ...validInput, password: 'password123!', confirmPassword: 'password123!' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password must contain at least one uppercase letter'
        });
      });

      it('should reject password without lowercase letter', () => {
        const input = { ...validInput, password: 'PASSWORD123!', confirmPassword: 'PASSWORD123!' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password must contain at least one lowercase letter'
        });
      });

      it('should reject password without number', () => {
        const input = { ...validInput, password: 'Password!', confirmPassword: 'Password!' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password must contain at least one number'
        });
      });

      it('should reject password without special character', () => {
        const input = { ...validInput, password: 'Password123', confirmPassword: 'Password123' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password must contain at least one special character'
        });
      });

      it('should reject password longer than 128 characters', () => {
        const longPassword = 'A1!' + 'a'.repeat(125);
        const input = { ...validInput, password: longPassword, confirmPassword: longPassword };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'password',
          message: 'Password must be 128 characters or less'
        });
      });
    });

    describe('confirmPassword validation', () => {
      it('should reject when confirmPassword does not match password', () => {
        const input = { ...validInput, confirmPassword: 'DifferentPassword123!' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'confirmPassword',
          message: 'Passwords do not match'
        });
      });

      it('should reject empty confirmPassword', () => {
        const input = { ...validInput, confirmPassword: '' };
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'confirmPassword',
          message: 'Password confirmation is required'
        });
      });
    });

    describe('multiple validation errors', () => {
      it('should return multiple errors for invalid input', () => {
        const input: CreateUserRequest = {
          email: 'invalid-email',
          firstName: '',
          lastName: 'a'.repeat(51),
          password: 'weak',
          confirmPassword: 'different',
        };
        
        const result = validateRegistrationInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });
  });
});