# Contributing to AI-Driven Development Platform

## Welcome Contributors! 🤝

Thank you for your interest in contributing to the AI-Driven Development Platform. This guide will help you get started with contributing code, documentation, and improvements to our platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Contribution Guidelines](#contribution-guidelines)
4. [Code Standards](#code-standards)
5. [Testing Requirements](#testing-requirements)
6. [Pull Request Process](#pull-request-process)
7. [Issue Management](#issue-management)
8. [Documentation Guidelines](#documentation-guidelines)

---

## Getting Started

### Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them succeed
- **Be collaborative**: Work together to solve problems
- **Be professional**: Maintain professionalism in all interactions

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Help us identify and resolve issues
- **Feature development**: Build new capabilities for the platform
- **Documentation**: Improve guides, API docs, and tutorials
- **Testing**: Enhance test coverage and quality assurance
- **Performance**: Optimize performance and scalability
- **Security**: Identify and resolve security vulnerabilities
- **UI/UX**: Improve user experience and interface design

---

## Development Setup

### Prerequisites

```bash
# Required tools
node --version    # v18.0+
npm --version     # v9.0+
git --version     # v2.30+
docker --version  # v20.10+

# Optional but recommended
code --version    # VS Code
```

### Initial Setup

#### 1. Fork and Clone Repository
```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/aicode-dev-platform.git
cd aicode-dev-platform

# Add upstream remote
git remote add upstream https://github.com/aicode-platform/aicode-dev-platform.git

# Verify remotes
git remote -v
```

#### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env.development

# Install dependencies
npm ci

# Setup database
npm run db:setup
npm run db:migrate
npm run db:seed

# Verify setup
npm run test:setup
```

#### 3. Development Environment
```bash
# Start development server
npm run dev

# In another terminal, start supporting services
docker-compose -f docker-compose.dev.yml up -d

# Verify everything is running
curl http://localhost:3000/health
```

### IDE Configuration

#### VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode", 
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-jest",
    "ms-vscode.azure-repos",
    "github.copilot"
  ]
}
```

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "jest.autoRun": "off",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

---

## Contribution Guidelines

### Branching Strategy

We use a Git Flow-based branching strategy:

```bash
# Main branches
main        # Production-ready code
develop     # Integration branch for features

# Supporting branches  
feature/*   # New features
bugfix/*    # Bug fixes
hotfix/*    # Critical production fixes
release/*   # Release preparation
```

#### Creating Feature Branches
```bash
# Start from develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/user-profile-enhancement

# Work on your feature...
git add .
git commit -m "feat: add user profile image upload"

# Push to your fork
git push origin feature/user-profile-enhancement
```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

#### Examples
```bash
# Good commit messages
feat(auth): add OAuth2 integration for GitHub
fix(api): resolve database connection timeout
docs(readme): update installation instructions
test(auth): add unit tests for JWT validation

# Bad commit messages
fix: bug fix
update code
changes
```

---

## Code Standards

### TypeScript Guidelines

#### Type Definitions
```typescript
// Use explicit types for public APIs
export interface CreateUserRequest {
  email: string;
  password: string;
  profile: {
    name: string;
    avatar?: string;
  };
}

// Use generic types for reusability
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Avoid 'any' - use specific types or unknown
function processData(data: unknown): ProcessedData {
  if (typeof data === 'object' && data !== null) {
    return validateAndTransform(data);
  }
  throw new Error('Invalid data format');
}
```

#### Error Handling
```typescript
// Use custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Proper async error handling
export async function createUser(userData: CreateUserRequest): Promise<User> {
  try {
    const validatedData = await validateUserData(userData);
    const user = await userRepository.create(validatedData);
    return user;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error; // Re-throw known errors
    }
    // Log unexpected errors and throw generic error
    logger.error('Failed to create user', { error, userData: { email: userData.email } });
    throw new Error('User creation failed');
  }
}
```

### Database Guidelines

#### Schema Design
```typescript
// Use descriptive field names
export interface UserSchema {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  profile: UserProfile;
  projects: Project[];
  teamMemberships: TeamMembership[];
}

// Use appropriate data types
export interface ProjectSchema {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'draft';
  visibility: 'private' | 'internal' | 'public';
  createdAt: Date;
  updatedAt: Date;
  
  // JSON fields for flexible data
  configuration: Record<string, unknown>;
  metadata: {
    platform: string;
    framework: string;
    features: string[];
  };
}
```

#### Migration Best Practices
```typescript
// migrations/001_create_users_table.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.timestamp('email_verified_at').nullable();
    table.timestamps(true, true); // created_at, updated_at
    
    // Indexes
    table.index('email');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
```

### API Design Guidelines

#### RESTful Endpoints
```typescript
// Good: Resource-based URLs
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
PATCH  /api/v1/projects/{id}
DELETE /api/v1/projects/{id}

// Good: Nested resources
GET    /api/v1/projects/{id}/workflows
POST   /api/v1/projects/{id}/workflows
GET    /api/v1/workflows/{id}

// Bad: Action-based URLs
POST   /api/v1/createProject
GET    /api/v1/getProjectById/{id}
```

#### Request/Response Format
```typescript
// Request validation with Joi
const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  platform: Joi.string().valid('android', 'ios', 'web').required(),
  template: Joi.string().optional(),
  configuration: Joi.object().optional()
});

// Consistent response format
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

---

## Testing Requirements

### Testing Strategy

We follow the testing pyramid approach:
- **70% Unit Tests**: Fast, isolated, comprehensive
- **20% Integration Tests**: Component interactions
- **10% End-to-End Tests**: Full user workflows

### Unit Testing

#### Test Structure
```typescript
// __tests__/services/userService.test.ts
import { UserService } from '../src/services/userService';
import { userRepository } from '../src/repositories/userRepository';
import { ValidationError } from '../src/errors/ValidationError';

// Mock dependencies
jest.mock('../src/repositories/userRepository');

describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        profile: { name: 'Test User' }
      };
      const mockUser = { id: '123', ...userData, passwordHash: 'hashed' };
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          passwordHash: expect.any(String)
        })
      );
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        password: 'securePassword123',
        profile: { name: 'Test User' }
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### Integration Testing

#### API Endpoint Testing
```typescript
// __tests__/integration/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user with valid credentials', async () => {
      // Arrange - Create test user
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'securePassword123',
          profile: { name: 'Test User' }
        })
        .expect(201);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'securePassword123'
        })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            email: 'test@example.com',
            profile: { name: 'Test User' }
          }
        }
      });
    });
  });
});
```

### Test Coverage Requirements

```bash
# Minimum coverage requirements
Statements: 80%
Branches: 75%
Functions: 85%
Lines: 80%

# Check coverage
npm run test:coverage

# Coverage reports
open coverage/lcov-report/index.html
```

---

## Pull Request Process

### Before Creating a PR

#### 1. Self-Review Checklist
```bash
# Code quality
□ Code follows style guidelines
□ No linting errors
□ TypeScript compilation successful
□ All tests passing
□ Test coverage meets requirements

# Documentation
□ Code is self-documenting with clear variable/function names
□ Complex logic has explanatory comments
□ Public APIs have JSDoc documentation
□ README updated if needed

# Testing
□ Unit tests for new functionality
□ Integration tests for API changes
□ Edge cases covered
□ Error handling tested

# Security
□ No hardcoded secrets or credentials
□ Input validation implemented
□ SQL injection prevention
□ XSS prevention measures
```

#### 2. Pre-PR Commands
```bash
# Sync with upstream
git checkout develop
git pull upstream develop
git checkout feature/your-feature
git rebase develop

# Run all checks
npm run lint
npm run typecheck
npm run test
npm run test:integration

# Build verification
npm run build
```

### Creating the Pull Request

#### PR Template
```markdown
## Description
Brief description of the changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Test coverage maintained/improved

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding documentation updated
- [ ] No new warnings generated

## Screenshots (if applicable)
Add screenshots for UI changes.

## Additional Notes
Any additional information for reviewers.
```

#### PR Title Guidelines
```bash
# Format: type(scope): description
feat(auth): add OAuth2 integration for GitHub
fix(api): resolve database connection timeout
docs(readme): update installation instructions
```

### Code Review Process

#### Review Criteria
- **Functionality**: Does it work as intended?
- **Code Quality**: Is it readable and maintainable?
- **Performance**: Are there any performance concerns?
- **Security**: Are there any security vulnerabilities?
- **Testing**: Is test coverage adequate?
- **Documentation**: Is documentation complete and accurate?

#### Reviewer Guidelines
- **Be constructive**: Provide specific, actionable feedback
- **Be timely**: Review within 24 hours when possible
- **Ask questions**: If something is unclear, ask for clarification
- **Suggest alternatives**: Offer better approaches when appropriate
- **Approve when ready**: Don't hold up good code unnecessarily

### Merge Process

#### Requirements for Merge
1. All CI checks passing
2. At least 2 approving reviews
3. No unresolved conversations
4. Up-to-date with base branch
5. Squash commits if necessary

#### Merge Types
- **Squash and merge**: For feature branches (default)
- **Rebase and merge**: For clean, logical commit history
- **Merge commit**: For release branches

---

## Issue Management

### Reporting Bugs

#### Bug Report Template
```markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. macOS, Linux, Windows]
- Node.js version: [e.g. 18.17.0]
- Browser: [e.g. Chrome, Safari]
- Version: [e.g. 1.0.0]

**Additional Context**
Any other context about the problem.
```

### Feature Requests

#### Feature Request Template
```markdown
**Feature Summary**
Brief description of the feature.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
Detailed description of the proposed solution.

**Alternatives Considered**
Other solutions you've considered.

**Additional Context**
Any other context, screenshots, or examples.

**Acceptance Criteria**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### Issue Labels

```yaml
# Type labels
bug: Something isn't working
enhancement: New feature or request
documentation: Improvements to documentation
question: Further information is requested

# Priority labels  
priority/critical: Critical priority
priority/high: High priority
priority/medium: Medium priority
priority/low: Low priority

# Status labels
status/triage: Needs triage
status/in-progress: Currently being worked on
status/blocked: Blocked by external dependency
status/ready-for-review: Ready for code review

# Component labels
component/api: API related
component/ui: User interface
component/database: Database related
component/auth: Authentication/authorization
component/ai: AI integration
```

---

## Documentation Guidelines

### Code Documentation

#### JSDoc Standards
```typescript
/**
 * Creates a new user account with the provided information.
 * 
 * @param userData - The user registration data
 * @param options - Additional options for user creation
 * @returns Promise resolving to the created user
 * @throws {ValidationError} When user data is invalid
 * @throws {ConflictError} When email already exists
 * 
 * @example
 * ```typescript
 * const user = await createUser({
 *   email: 'user@example.com',
 *   password: 'securePassword123',
 *   profile: { name: 'John Doe' }
 * });
 * ```
 */
export async function createUser(
  userData: CreateUserRequest,
  options?: CreateUserOptions
): Promise<User> {
  // Implementation...
}
```

### API Documentation

Keep API documentation up to date with code changes:

```typescript
// Update OpenAPI spec for new endpoints
/**
 * @openapi
 * /api/v1/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectResponse'
 */
```

### README Updates

When adding new features, update relevant README sections:
- Installation instructions
- Configuration options  
- Usage examples
- API changes

---

## Community

### Getting Help

- **Slack**: Join our [contributor Slack](https://aicode-contributors.slack.com)
- **Discussions**: Use [GitHub Discussions](https://github.com/aicode-platform/aicode-dev-platform/discussions)
- **Issues**: Search existing issues before creating new ones
- **Email**: contributor-help@aicode-platform.com

### Recognition

We recognize our contributors through:
- **Contributor Badge**: GitHub profile badge for contributors
- **Credits**: Listed in project CREDITS.md file
- **Blog Posts**: Featured contributor spotlights
- **Swag**: Contributor merchandise for significant contributions

### Maintainer Contact

For questions about contributing or the project direction:
- **Lead Maintainer**: lead@aicode-platform.com
- **Technical Questions**: tech@aicode-platform.com
- **Community**: community@aicode-platform.com

---

Thank you for contributing to the AI-Driven Development Platform! Your contributions help make AI-powered development accessible to everyone. 🚀