#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Environment validation utility
class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validateRequired(key, value, description) {
    if (!value || value.trim() === '') {
      this.errors.push(`❌ ${key}: ${description} is required but not set`);
      return false;
    }
    return true;
  }

  validateUrl(key, value, description) {
    if (value && !value.match(/^https?:\/\/.+/)) {
      this.warnings.push(`⚠️ ${key}: ${description} should be a valid URL`);
    }
  }

  validatePort(key, value, description) {
    const port = parseInt(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      this.errors.push(`❌ ${key}: ${description} must be a valid port number (1-65535)`);
      return false;
    }
    return true;
  }

  validateSecret(key, value, description) {
    if (!this.validateRequired(key, value, description)) return false;
    
    if (value.length < 32) {
      this.errors.push(`❌ ${key}: ${description} must be at least 32 characters long`);
      return false;
    }
    
    if (value.includes('change-in-production') || value.includes('secret')) {
      this.warnings.push(`⚠️ ${key}: ${description} appears to use a default/weak value`);
    }
    
    return true;
  }

  validateEnvironment() {
    // Load environment variables
    require('dotenv').config();
    const env = process.env;

    console.log('🔍 Validating environment configuration...\n');

    // Required configurations
    this.validateRequired('NODE_ENV', env.NODE_ENV, 'Node environment');
    this.validatePort('PORT', env.PORT, 'Server port');
    this.validateRequired('DATABASE_URL', env.DATABASE_URL, 'Database connection URL');

    // Security configurations
    this.validateSecret('JWT_SECRET', env.JWT_SECRET, 'JWT secret');
    this.validateSecret('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, 'JWT refresh secret');

    // Optional but recommended
    if (!env.BCRYPT_SALT_ROUNDS) {
      this.warnings.push('⚠️ BCRYPT_SALT_ROUNDS: Not set, using default (12)');
    } else {
      const rounds = parseInt(env.BCRYPT_SALT_ROUNDS);
      if (rounds < 10 || rounds > 15) {
        this.warnings.push('⚠️ BCRYPT_SALT_ROUNDS: Recommended range is 10-15');
      }
    }

    // Database URL format validation
    if (env.DATABASE_URL && !env.DATABASE_URL.startsWith('postgresql://')) {
      this.errors.push('❌ DATABASE_URL: Must be a PostgreSQL connection string');
    }

    // Development vs Production checks
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET && env.JWT_SECRET.includes('dev')) {
        this.errors.push('❌ JWT_SECRET: Using development secret in production');
      }
      
      if (!env.ALLOWED_ORIGINS) {
        this.warnings.push('⚠️ ALLOWED_ORIGINS: Not configured for production');
      }

      if (env.LOG_LEVEL === 'debug') {
        this.warnings.push('⚠️ LOG_LEVEL: Debug logging in production may impact performance');
      }
    }

    // Check for common configuration issues
    if (env.DATABASE_URL && env.DATABASE_URL.includes('localhost') && env.NODE_ENV === 'production') {
      this.warnings.push('⚠️ DATABASE_URL: Using localhost in production environment');
    }

    // Display results
    this.displayResults();
    
    return this.errors.length === 0;
  }

  displayResults() {
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Environment configuration is valid!\n');
      return;
    }

    if (this.errors.length > 0) {
      console.log('🚨 Configuration Errors:');
      this.errors.forEach(error => console.log(error));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('📋 Configuration Warnings:');
      this.warnings.forEach(warning => console.log(warning));
      console.log('');
    }

    if (this.errors.length > 0) {
      console.log('💡 Fix the errors above before starting the application.');
    } else {
      console.log('💡 The warnings above should be addressed for optimal security and performance.');
    }
    console.log('');
  }
}

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('💡 Run "npm run setup" or copy .env.example to .env');
  process.exit(1);
}

// Run validation
const validator = new EnvironmentValidator();
const isValid = validator.validateEnvironment();

process.exit(isValid ? 0 : 1);