# API Reference

## Overview

The AI-Driven Development Platform provides a comprehensive RESTful API for all platform functionality. This document covers authentication, endpoints, request/response formats, and integration patterns.

## Base URL

```
Production:  https://api.aicode-platform.com/v1
Staging:     https://staging-api.aicode-platform.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

### JWT Token Authentication

All API requests require authentication using JWT tokens in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Obtaining Access Tokens

#### Login Endpoint
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "role": "developer"
    },
    "expiresIn": 86400
  }
}
```

#### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Core API Endpoints

### User Management

#### Get Current User
```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "developer",
    "profile": {
      "name": "John Developer",
      "avatar": "https://cdn.aicode-platform.com/avatars/user_123.jpg",
      "preferences": {
        "theme": "dark",
        "notifications": true
      }
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "lastLogin": "2025-01-15T10:30:00Z"
  }
}
```

#### Update User Profile
```http
PATCH /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "profile": {
    "name": "Jane Developer",
    "preferences": {
      "theme": "light",
      "notifications": false
    }
  }
}
```

### Project Management

#### List Projects
```http
GET /projects?limit=20&offset=0&sort=createdAt&order=desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number of projects to return (default: 20, max: 100)
- `offset`: Number of projects to skip (default: 0)
- `sort`: Field to sort by (`createdAt`, `updatedAt`, `name`)
- `order`: Sort order (`asc`, `desc`)
- `status`: Filter by status (`active`, `archived`, `draft`)

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "proj_456",
        "name": "Mobile Banking App",
        "description": "AI-generated Android banking application",
        "status": "active",
        "platform": "android",
        "githubRepo": "https://github.com/company/mobile-banking",
        "team": {
          "owner": "user_123",
          "members": ["user_124", "user_125"],
          "role": "owner"
        },
        "aiWorkflows": {
          "total": 15,
          "completed": 12,
          "inProgress": 2,
          "pending": 1
        },
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

#### Create Project
```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "E-Commerce App",
  "description": "AI-driven e-commerce mobile application",
  "platform": "android",
  "template": "ecommerce_template",
  "configuration": {
    "packageName": "com.example.ecommerce",
    "minSdkVersion": 24,
    "targetSdkVersion": 34,
    "features": ["authentication", "payments", "notifications"]
  },
  "githubIntegration": {
    "createRepo": true,
    "repoName": "ecommerce-mobile-app",
    "isPrivate": true
  }
}
```

#### Get Project Details
```http
GET /projects/{projectId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "proj_789",
    "name": "E-Commerce App",
    "description": "AI-driven e-commerce mobile application",
    "status": "active",
    "platform": "android",
    "configuration": {
      "packageName": "com.example.ecommerce",
      "minSdkVersion": 24,
      "targetSdkVersion": 34,
      "features": ["authentication", "payments", "notifications"]
    },
    "githubRepo": "https://github.com/company/ecommerce-mobile-app",
    "team": {
      "owner": "user_123",
      "members": ["user_124", "user_125"],
      "permissions": {
        "canEdit": true,
        "canDelete": true,
        "canInvite": true
      }
    },
    "aiWorkflows": {
      "total": 8,
      "completed": 5,
      "inProgress": 2,
      "pending": 1,
      "workflows": [
        {
          "id": "workflow_101",
          "name": "User Authentication Setup",
          "status": "completed",
          "type": "feature_generation",
          "completedAt": "2025-01-10T14:22:00Z"
        }
      ]
    },
    "analytics": {
      "codeGenerated": 15420,
      "testsCreated": 89,
      "issuesResolved": 12,
      "lastActivity": "2025-01-15T10:30:00Z"
    }
  }
}
```

### AI Workflow Management

#### Start AI Workflow
```http
POST /projects/{projectId}/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "feature_generation",
  "name": "Payment Integration",
  "description": "Implement payment processing with Stripe integration",
  "configuration": {
    "provider": "stripe",
    "features": ["credit_card", "google_pay", "apple_pay"],
    "testMode": true
  },
  "humanCheckpoints": [
    "architecture_review",
    "security_review",
    "final_approval"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "workflow_202",
    "status": "initiated",
    "estimatedDuration": "45 minutes",
    "checkpoints": [
      {
        "id": "checkpoint_1",
        "name": "architecture_review",
        "status": "pending",
        "description": "Review AI-generated architecture for payment integration"
      }
    ],
    "progressUrl": "/workflows/workflow_202/progress"
  }
}
```

#### Get Workflow Status
```http
GET /workflows/{workflowId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "workflow_202",
    "projectId": "proj_789",
    "name": "Payment Integration",
    "status": "awaiting_checkpoint",
    "progress": 35,
    "currentStep": {
      "name": "architecture_review",
      "description": "AI has generated payment integration architecture",
      "type": "human_checkpoint",
      "createdAt": "2025-01-15T11:15:00Z"
    },
    "generatedFiles": [
      {
        "path": "app/src/main/java/com/example/payments/PaymentManager.java",
        "type": "java",
        "size": 2845,
        "preview": "public class PaymentManager {\n    private StripeService stripeService;\n    // ... AI-generated code"
      }
    ],
    "checkpointData": {
      "id": "checkpoint_1",
      "name": "architecture_review",
      "description": "Review the AI-generated payment architecture and implementation approach",
      "aiSummary": "Generated secure payment integration with Stripe API, including tokenization, webhook handling, and error recovery mechanisms.",
      "reviewItems": [
        "Security implementation for payment data handling",
        "Error handling and retry logic",
        "Webhook configuration for payment status updates"
      ],
      "actions": ["approve", "request_changes", "reject"]
    }
  }
}
```

#### Respond to Workflow Checkpoint
```http
POST /workflows/{workflowId}/checkpoints/{checkpointId}/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "approve",
  "feedback": "Architecture looks good. Please ensure PCI compliance for payment data handling.",
  "modifications": [
    {
      "file": "PaymentManager.java",
      "instruction": "Add PCI DSS compliance documentation and ensure no sensitive data is logged"
    }
  ]
}
```

### Code Generation

#### Generate Code Component
```http
POST /projects/{projectId}/generate/component
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "activity",
  "name": "ProfileActivity",
  "description": "User profile screen with edit capabilities",
  "features": [
    "user_info_display",
    "profile_editing",
    "image_upload",
    "validation"
  ],
  "dependencies": [
    "retrofit",
    "glide",
    "material_design"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generationId": "gen_303",
    "estimatedTime": "3-5 minutes",
    "files": [
      {
        "path": "app/src/main/java/com/example/ui/ProfileActivity.java",
        "type": "java"
      },
      {
        "path": "app/src/main/res/layout/activity_profile.xml",
        "type": "xml"
      },
      {
        "path": "app/src/test/java/com/example/ui/ProfileActivityTest.java",
        "type": "java"
      }
    ],
    "statusUrl": "/generate/gen_303/status"
  }
}
```

#### Get Generation Status
```http
GET /generate/{generationId}/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "gen_303",
    "status": "completed",
    "progress": 100,
    "generatedFiles": [
      {
        "path": "app/src/main/java/com/example/ui/ProfileActivity.java",
        "content": "package com.example.ui;\n\nimport android.os.Bundle;\n// ... AI-generated code",
        "size": 3245,
        "checksumSha256": "a1b2c3d4e5f6..."
      }
    ],
    "quality": {
      "codeComplexity": "low",
      "testCoverage": 85,
      "securityScore": 95,
      "performanceScore": 92
    },
    "completedAt": "2025-01-15T11:25:00Z"
  }
}
```

### Team Collaboration

#### Get Team Members
```http
GET /projects/{projectId}/team
Authorization: Bearer <token>
```

#### Invite Team Member
```http
POST /projects/{projectId}/team/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "developer@company.com",
  "role": "developer",
  "permissions": ["read", "write", "execute_workflows"]
}
```

#### Update Member Role
```http
PATCH /projects/{projectId}/team/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "senior_developer",
  "permissions": ["read", "write", "execute_workflows", "manage_team"]
}
```

### Analytics & Insights

#### Get Project Analytics
```http
GET /projects/{projectId}/analytics?period=30d&metrics=code,tests,workflows
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "summary": {
      "linesOfCodeGenerated": 15420,
      "testsCreated": 89,
      "workflowsCompleted": 25,
      "issuesResolved": 12,
      "developmentVelocity": "+35%"
    },
    "trends": {
      "codeGeneration": [
        { "date": "2025-01-01", "value": 450 },
        { "date": "2025-01-02", "value": 620 }
      ]
    },
    "qualityMetrics": {
      "averageComplexity": "low",
      "testCoverage": 87,
      "securityScore": 94,
      "performanceScore": 91
    }
  }
}
```

## WebSocket API

### Real-time Workflow Updates

Connect to WebSocket for real-time workflow status updates:

```javascript
const ws = new WebSocket('wss://api.aicode-platform.com/v1/ws');
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: `workflow:${workflowId}`,
  token: 'Bearer <jwt_token>'
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Workflow update:', data);
};
```

**Message Format:**
```json
{
  "type": "workflow_update",
  "workflowId": "workflow_202",
  "status": "in_progress",
  "progress": 65,
  "step": "code_generation",
  "timestamp": "2025-01-15T11:30:00Z"
}
```

## Rate Limiting

### Request Limits
- **Free Tier**: 100 requests/hour, 10 concurrent workflows
- **Pro Tier**: 1,000 requests/hour, 50 concurrent workflows
- **Enterprise**: Custom limits based on agreement

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642665600
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2025-01-15T11:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` (401): Missing or invalid authentication
- `INSUFFICIENT_PERMISSIONS` (403): User lacks required permissions
- `RESOURCE_NOT_FOUND` (404): Requested resource doesn't exist
- `VALIDATION_ERROR` (400): Invalid request parameters
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

## Webhooks

### Webhook Configuration

Configure webhooks to receive real-time notifications:

```http
POST /webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/aicode",
  "events": [
    "workflow.completed",
    "workflow.failed",
    "workflow.checkpoint_required"
  ],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

#### Workflow Completed
```json
{
  "event": "workflow.completed",
  "workflowId": "workflow_202",
  "projectId": "proj_789",
  "timestamp": "2025-01-15T12:00:00Z",
  "data": {
    "name": "Payment Integration",
    "duration": "42 minutes",
    "filesGenerated": 8,
    "testsCreated": 12
  }
}
```

## SDK and Libraries

### Official SDKs
- **JavaScript/TypeScript**: `npm install @aicode-platform/sdk`
- **Python**: `pip install aicode-platform-sdk`
- **Java**: Available via Maven Central
- **Go**: `go get github.com/aicode-platform/go-sdk`

### SDK Example (JavaScript)
```javascript
import { AiCodeClient } from '@aicode-platform/sdk';

const client = new AiCodeClient({
  apiKey: 'your_api_key',
  environment: 'production'
});

// Create a project
const project = await client.projects.create({
  name: 'My Mobile App',
  platform: 'android',
  template: 'basic_android'
});

// Start a workflow
const workflow = await client.workflows.start(project.id, {
  type: 'feature_generation',
  name: 'User Authentication',
  configuration: {
    authProvider: 'firebase',
    features: ['email_login', 'social_login']
  }
});
```

## API Versioning

### Version Management
- Current version: `v1`
- Backwards compatibility: 12 months minimum
- Deprecation notice: 6 months before removal
- Version header: `API-Version: v1`

### Version Migration
When migrating to a new API version:
1. Update the base URL to include the new version
2. Review the changelog for breaking changes
3. Update your request/response handling code
4. Test thoroughly in staging environment
5. Monitor for any issues after deployment

For integration examples and advanced usage, see our [Integration Guides](integrations.md).