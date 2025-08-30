-- Initialize database for development
CREATE DATABASE aicode_dev;
CREATE DATABASE aicode_test;

-- Create user for application
CREATE USER aicode_user WITH PASSWORD 'aicode_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE aicode_dev TO aicode_user;
GRANT ALL PRIVILEGES ON DATABASE aicode_test TO aicode_user;