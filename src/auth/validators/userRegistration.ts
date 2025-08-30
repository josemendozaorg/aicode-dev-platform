import { CreateUserRequest } from '@/types/user.types';
import { ValidationError } from '@/types/auth.types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateRegistrationInput = (input: CreateUserRequest): ValidationResult => {
  const errors: ValidationError[] = [];

  // Email validation
  if (!input.email || input.email.trim() === '') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    } else if (input.email.length > 254) {
      errors.push({ field: 'email', message: 'Email must be 254 characters or less' });
    }
  }

  // First name validation
  if (!input.firstName || input.firstName.trim() === '') {
    errors.push({ field: 'firstName', message: 'First name is required' });
  } else {
    if (input.firstName.length > 50) {
      errors.push({ field: 'firstName', message: 'First name must be 50 characters or less' });
    }
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(input.firstName)) {
      errors.push({ 
        field: 'firstName', 
        message: 'First name can only contain letters, spaces, hyphens, and apostrophes' 
      });
    }
  }

  // Last name validation
  if (!input.lastName || input.lastName.trim() === '') {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  } else {
    if (input.lastName.length > 50) {
      errors.push({ field: 'lastName', message: 'Last name must be 50 characters or less' });
    }
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(input.lastName)) {
      errors.push({ 
        field: 'lastName', 
        message: 'Last name can only contain letters, spaces, hyphens, and apostrophes' 
      });
    }
  }

  // Password validation
  if (!input.password || input.password === '') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else {
    if (input.password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
    }
    if (input.password.length > 128) {
      errors.push({ field: 'password', message: 'Password must be 128 characters or less' });
    }
    if (!/[A-Z]/.test(input.password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(input.password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
    }
    if (!/\d/.test(input.password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(input.password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one special character' });
    }
  }

  // Confirm password validation
  if (!input.confirmPassword || input.confirmPassword === '') {
    errors.push({ field: 'confirmPassword', message: 'Password confirmation is required' });
  } else if (input.password !== input.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};