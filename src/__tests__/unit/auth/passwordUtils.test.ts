import { hashPassword, verifyPassword, generateRandomPassword } from '@/auth/utils/passwordUtils';
import bcrypt from 'bcryptjs';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should use the configured salt rounds', async () => {
      const originalEnv = process.env.BCRYPT_SALT_ROUNDS;
      process.env.BCRYPT_SALT_ROUNDS = '10';

      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      // Bcrypt hash format: $2a$rounds$salt+hash
      const rounds = hashedPassword.split('$')[2];
      expect(rounds).toBe('10');

      process.env.BCRYPT_SALT_ROUNDS = originalEnv;
    });

    it('should use default salt rounds when not configured', async () => {
      const originalEnv = process.env.BCRYPT_SALT_ROUNDS;
      delete process.env.BCRYPT_SALT_ROUNDS;

      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      // Should use default 12 rounds
      const rounds = hashedPassword.split('$')[2];
      expect(rounds).toBe('12');

      process.env.BCRYPT_SALT_ROUNDS = originalEnv;
    });

    it('should throw error when hashing fails', async () => {
      // Mock bcrypt.hash to throw an error
      const originalHash = bcrypt.hash;
      bcrypt.hash = jest.fn().mockRejectedValue(new Error('Hashing error'));

      await expect(hashPassword('TestPassword123!')).rejects.toThrow('Failed to hash password');

      bcrypt.hash = originalHash;
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword('', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should throw error when verification fails', async () => {
      // Mock bcrypt.compare to throw an error
      const originalCompare = bcrypt.compare;
      bcrypt.compare = jest.fn().mockRejectedValue(new Error('Comparison error'));

      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      await expect(verifyPassword(password, hashedPassword)).rejects.toThrow('Failed to verify password');

      bcrypt.compare = originalCompare;
    });

    it('should handle invalid hash format', async () => {
      const password = 'TestPassword123!';
      const invalidHash = 'invalid-hash-format';

      const isValid = await verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password with default length', () => {
      const password = generateRandomPassword();
      
      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBe(12);
    });

    it('should generate password with specified length', () => {
      const length = 16;
      const password = generateRandomPassword(length);
      
      expect(password.length).toBe(length);
    });

    it('should generate different passwords on each call', () => {
      const password1 = generateRandomPassword();
      const password2 = generateRandomPassword();
      
      expect(password1).not.toBe(password2);
    });

    it('should include at least one lowercase letter', () => {
      const password = generateRandomPassword(20);
      const hasLowercase = /[a-z]/.test(password);
      
      expect(hasLowercase).toBe(true);
    });

    it('should include at least one uppercase letter', () => {
      const password = generateRandomPassword(20);
      const hasUppercase = /[A-Z]/.test(password);
      
      expect(hasUppercase).toBe(true);
    });

    it('should include at least one number', () => {
      const password = generateRandomPassword(20);
      const hasNumber = /\d/.test(password);
      
      expect(hasNumber).toBe(true);
    });

    it('should include at least one special character', () => {
      const password = generateRandomPassword(20);
      const hasSpecial = /[!@#$%^&*]/.test(password);
      
      expect(hasSpecial).toBe(true);
    });

    it('should generate valid password for minimum length', () => {
      // Minimum length should be at least 4 to include all required character types
      const password = generateRandomPassword(4);
      
      expect(password.length).toBe(4);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });

    it('should handle large password lengths', () => {
      const password = generateRandomPassword(100);
      
      expect(password.length).toBe(100);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/\d/.test(password)).toBe(true);
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });
  });
});