# DevOps Infrastructure and CI/CD Setup Guide

## 🚀 Overview

This document provides comprehensive guidance for the AI Code Platform's enterprise-grade DevOps infrastructure, including CI/CD pipelines, Infrastructure as Code (IaC), monitoring, security automation, and multi-environment deployment strategies.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [CI/CD Pipelines](#cicd-pipelines)
5. [Infrastructure as Code](#infrastructure-as-code)
6. [Security Automation](#security-automation)
7. [Monitoring & Observability](#monitoring--observability)
8. [Deployment Guide](#deployment-guide)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## 🏗️ Architecture Overview

### Infrastructure Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Production Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│ │     ALB     │  │   Route53   │  │ CloudFront  │             │
│ └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                 EKS Cluster (Multi-AZ)                     │ │
│ │  ┌───────────┐  ┌───────────┐  ┌───────────┐             │ │
│ │  │   Node    │  │   Node    │  │   Node    │             │ │
│ │  │ Group 1   │  │ Group 2   │  │ Group 3   │             │ │
│ │  └───────────┘  └───────────┘  └───────────┘             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│ │RDS Multi-AZ │  │Redis Cluster│  │   S3 + KMS  │             │
│ │+ Read Replica│  │             │  │             │             │
│ └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Environment Strategy

- **Development**: Local development with Docker Compose
- **Staging**: AWS EKS in us-west-2 with reduced capacity
- **Production**: AWS EKS in us-east-1 with high availability and multi-AZ setup

### Technology Stack

- **Container Orchestration**: Kubernetes (Amazon EKS)
- **Infrastructure as Code**: Terraform
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana, CloudWatch
- **Security**: AWS KMS, IAM, Security Groups, OWASP ZAP
- **Databases**: PostgreSQL (RDS), Redis (ElastiCache)
- **Load Balancing**: Application Load Balancer (ALB)

## 📋 Prerequisites

### Required Tools

```bash
# Install required CLI tools
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update && sudo apt-get install helm

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

### AWS Account Setup

1. **Create AWS Account**: Ensure you have an AWS account with appropriate permissions
2. **IAM User Setup**: Create IAM user with necessary permissions for EKS, RDS, ElastiCache, S3, etc.
3. **S3 Backend**: Create S3 bucket for Terraform state storage
4. **DynamoDB Table**: Create table for Terraform state locking

```bash
# Create Terraform backend resources
aws s3 mb s3://aicode-terraform-state --region us-east-1
aws dynamodb create-table \
    --table-name aicode-terraform-locks \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
```

### GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Container Registry
GITHUB_TOKEN=<github-token-with-packages-write>

# Security Tools
SNYK_TOKEN=<snyk-token>
CODECOV_TOKEN=<codecov-token>

# Monitoring
SLACK_WEBHOOK_URL=<slack-webhook-for-notifications>
SECURITY_SLACK_WEBHOOK_URL=<security-team-webhook>

# Database (for staging/production)
DB_PASSWORD=<secure-database-password>
JWT_SECRET=<jwt-secret-key>
JWT_REFRESH_SECRET=<jwt-refresh-secret>
```

## 🔄 CI/CD Pipelines

### Pipeline Architecture

The CI/CD system consists of three main workflows:

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers**: Push to main/develop/feature branches, Pull Requests

**Jobs**:
- **Code Quality**: ESLint, Prettier, TypeScript checking
- **Security Scanning**: CodeQL, Snyk, dependency audit
- **Testing**: Unit tests, integration tests with PostgreSQL/Redis
- **Docker Build**: Multi-stage build with vulnerability scanning
- **Performance Tests**: K6 load testing

**Quality Gates**:
- TypeScript compilation: 0 errors
- Test coverage: >90%
- Security vulnerabilities: No critical/high issues
- Performance: P95 response time <2s

#### 2. Deployment Pipeline (`.github/workflows/deploy.yml`)

**Triggers**: Successful CI pipeline completion, Manual dispatch

**Environments**:
- **Staging**: Automatic deployment from develop branch
- **Production**: Automatic deployment from main branch

**Deployment Strategy**:
- Blue-Green deployment for production
- Rolling updates for staging
- Automatic rollback on failure

#### 3. Security Pipeline (`.github/workflows/security.yml`)

**Triggers**: Daily scheduled, Push to main branches, Manual dispatch

**Security Scans**:
- Dependency vulnerability scanning (npm audit, Snyk)
- Static Application Security Testing (SAST) with CodeQL
- Secret scanning with TruffleHog and GitLeaks
- Container security scanning with Trivy
- Infrastructure security with Checkov and Terrascan

### Pipeline Configuration

#### Environment Variables
```yaml
# Production deployment
ENVIRONMENT: production
AWS_REGION: us-east-1
EKS_CLUSTER: aicode-production

# Staging deployment  
ENVIRONMENT: staging
AWS_REGION: us-west-2
EKS_CLUSTER: aicode-staging
```

#### Deployment Approval
Production deployments require manual approval through GitHub Environments. Configure protection rules:

1. Go to Settings → Environments
2. Create `production` environment
3. Add required reviewers
4. Set deployment branches to `main` only

## 🏗️ Infrastructure as Code

### Terraform Structure

```
infrastructure/
├── terraform/
│   ├── staging/
│   │   ├── main.tf           # Staging infrastructure
│   │   ├── variables.tf      # Input variables
│   │   └── outputs.tf        # Output values
│   └── production/
│       ├── main.tf           # Production infrastructure
│       ├── variables.tf      # Input variables
│       └── outputs.tf        # Output values
└── k8s/
    ├── staging/
    │   ├── namespace.yaml    # Kubernetes namespaces
    │   ├── configmap.yaml    # Configuration
    │   ├── secret.yaml       # Secrets (template)
    │   ├── deployment.yaml   # Application deployment
    │   ├── service.yaml      # Kubernetes services
    │   └── monitoring.yaml   # Monitoring stack
    └── production/
        └── [similar structure]
```

### Infrastructure Components

#### AWS EKS Cluster
- **Staging**: 2 nodes (t3.medium), single AZ
- **Production**: 3+ nodes (m5.large+), multi-AZ with auto-scaling

#### Database Setup
- **PostgreSQL**: RDS with Multi-AZ for production, read replicas
- **Redis**: ElastiCache cluster mode for high availability
- **Encryption**: All data encrypted at rest with KMS

#### Networking
- **VPC**: Custom VPC with public/private subnets across multiple AZs
- **Security Groups**: Least-privilege access rules
- **NAT Gateways**: High availability for private subnet internet access

### Terraform Commands

```bash
# Initialize Terraform
cd infrastructure/terraform/staging
terraform init

# Plan deployment
terraform plan -out=staging.tfplan

# Apply changes
terraform apply staging.tfplan

# View outputs
terraform output
```

### Infrastructure Monitoring

Terraform state is stored in S3 with DynamoDB locking for team collaboration:
- State bucket: `aicode-terraform-state`
- Lock table: `aicode-terraform-locks`
- Versioning and encryption enabled

## 🔒 Security Automation

### Security Scanning Pipeline

The security automation runs comprehensive scans across multiple dimensions:

#### 1. Dependency Scanning
- **npm audit**: Built-in Node.js vulnerability scanner
- **Snyk**: Commercial vulnerability database with fix suggestions
- **GitHub Dependabot**: Automatic dependency updates

#### 2. Static Application Security Testing (SAST)
- **CodeQL**: GitHub's semantic code analysis
- **Semgrep**: Pattern-based static analysis for security bugs

#### 3. Secret Detection
- **TruffleHog**: High-entropy secret detection
- **GitLeaks**: Git secret scanner

#### 4. Infrastructure Security
- **Checkov**: Terraform/Kubernetes security best practices
- **Terrascan**: Cloud resource misconfiguration detection
- **KICS**: Kubernetes security scanning

#### 5. Container Security
- **Trivy**: Container image vulnerability scanning
- **Docker Bench**: Docker security best practices

### Security Configuration

#### Environment-specific Security
```bash
# Staging security requirements
- Basic SSL/TLS encryption
- Standard security headers
- Rate limiting: 100 req/15min

# Production security requirements  
- End-to-end encryption
- Advanced security headers (CSP, HSTS)
- Rate limiting: Adaptive based on user behavior
- WAF protection (optional)
- DDoS protection with AWS Shield
```

#### Secret Management
- Kubernetes secrets for application configuration
- AWS Systems Manager Parameter Store for infrastructure secrets
- KMS encryption for all sensitive data
- Secret rotation policies

### Security Monitoring
- Real-time security alerts via Slack
- Security dashboard in Grafana
- Automated security report generation
- Integration with GitHub Security tab

## 📊 Monitoring & Observability

### Monitoring Stack

The monitoring system provides comprehensive observability across all environments:

#### Components
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **CloudWatch**: AWS service metrics and logs
- **AlertManager**: Alert routing and management

#### Key Metrics
- **Application Performance**: Response time, error rate, throughput
- **Infrastructure**: CPU, memory, disk, network utilization
- **Business Metrics**: User registrations, API usage, feature adoption
- **Security Events**: Failed login attempts, rate limit hits, security scan results

### Dashboards

Pre-configured Grafana dashboards include:

1. **Application Overview**
   - Request rate and response times
   - Error rates and status code distribution
   - Database connection pool status
   - Cache hit/miss ratios

2. **Infrastructure Health**
   - Kubernetes cluster status
   - Node resource utilization
   - Pod restart rates
   - Network traffic patterns

3. **Security Dashboard**
   - Authentication failures
   - Rate limiting events
   - Security scan results
   - Vulnerability trends

4. **Business Intelligence**
   - User registration trends
   - API endpoint usage
   - Feature adoption rates
   - Geographic distribution

### Alerting Rules

Critical alerts configured in Prometheus:

```yaml
# High-priority alerts (PagerDuty/SMS)
- High error rate (>5% for 5 minutes)
- Application down (all instances failing)
- Database connection failures
- Memory usage >90% for 10 minutes

# Medium-priority alerts (Slack)
- High response time (P95 >2s for 10 minutes)
- High CPU usage (>80% for 15 minutes)
- Disk space >85%
- Pod restart loops

# Low-priority alerts (Email)
- Security vulnerabilities detected
- Certificate expiration (30 days)
- Backup failures
- Performance degradation trends
```

### Log Management

Centralized logging with structured JSON format:
- Application logs: Business logic, errors, performance
- Access logs: HTTP requests, security events
- Infrastructure logs: Kubernetes events, AWS service logs
- Audit logs: Administrative actions, security events

## 🚀 Deployment Guide

### Quick Start

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd aicode-dev-platform
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.staging
   # Edit .env.staging with your configuration
   ```

3. **Deploy Infrastructure**
   ```bash
   ./scripts/deployment/deploy.sh staging deploy
   ```

### Manual Deployment Process

#### Staging Deployment

```bash
# 1. Deploy infrastructure
cd infrastructure/terraform/staging
terraform init
terraform plan -out=staging.tfplan
terraform apply staging.tfplan

# 2. Configure kubectl
aws eks update-kubeconfig --name aicode-staging --region us-west-2

# 3. Deploy application
kubectl apply -f ../k8s/staging/
kubectl rollout status deployment/aicode-api -n aicode-staging

# 4. Verify deployment
kubectl get pods -n aicode-staging
curl https://staging.aicode-platform.dev/health
```

#### Production Deployment

```bash
# 1. Review and test staging deployment first
./scripts/deployment/deploy.sh staging status

# 2. Deploy to production (requires approval)
./scripts/deployment/deploy.sh production deploy

# 3. Monitor deployment
kubectl logs -f deployment/aicode-api -n aicode-production
```

### Deployment Script Usage

The deployment script provides comprehensive automation:

```bash
# Basic usage
./scripts/deployment/deploy.sh <environment> <action>

# Examples
./scripts/deployment/deploy.sh staging plan
./scripts/deployment/deploy.sh staging deploy
./scripts/deployment/deploy.sh production plan --dry-run
./scripts/deployment/deploy.sh production deploy --skip-tests
./scripts/deployment/deploy.sh staging rollback

# Options
-h, --help          Show help message
-t, --skip-tests    Skip test execution
-s, --skip-security Skip security scans
-d, --dry-run       Show what would be done
-f, --force         Force deployment without confirmations
--debug             Enable debug output
```

### Blue-Green Deployment (Production)

Production deployments use blue-green strategy for zero downtime:

1. **Deploy Green Environment**: New version deployed alongside current (blue)
2. **Health Checks**: Automated testing of green environment
3. **Traffic Switching**: Load balancer switches traffic to green
4. **Monitoring**: Enhanced monitoring for 1 hour post-deployment
5. **Blue Cleanup**: Old environment cleaned up after successful deployment

### Rollback Procedures

#### Automatic Rollback
- Triggered by failed health checks
- Kubernetes deployment rollback
- Database transaction rollback (if applicable)
- Notification to team

#### Manual Rollback
```bash
./scripts/deployment/deploy.sh production rollback
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Pipeline Failures

**TypeScript Compilation Errors**
```bash
# Check local compilation
npm run typecheck

# Fix common issues
- Unused variables: Add underscore prefix (_variable)
- Type errors: Check JWT token type casting
- Import errors: Verify path resolution in tsconfig.json
```

**Test Failures**
```bash
# Run tests locally
npm run test:coverage
npm run test:integration

# Common fixes
- Database connection: Check DATABASE_URL environment variable
- Redis connection: Ensure Redis is running locally
- JWT secrets: Verify test environment variables
```

**Security Scan Failures**
```bash
# Check vulnerabilities
npm audit
snyk test

# Fix approach
- Update dependencies: npm update
- Review and accept risks: Document exceptions
- Apply patches: npm audit fix
```

#### 2. Infrastructure Issues

**Terraform State Errors**
```bash
# State lock issues
terraform force-unlock <lock-id>

# State drift
terraform refresh
terraform plan

# Import existing resources
terraform import <resource-type>.<name> <aws-resource-id>
```

**EKS Access Issues**
```bash
# Update kubeconfig
aws eks update-kubeconfig --name aicode-staging --region us-west-2

# Check IAM permissions
aws sts get-caller-identity
kubectl auth can-i "*" "*" --all-namespaces
```

#### 3. Application Issues

**Pod Startup Failures**
```bash
# Debug pod issues
kubectl describe pod <pod-name> -n aicode-staging
kubectl logs <pod-name> -n aicode-staging --previous

# Common causes
- Image pull errors: Check registry credentials
- Environment variables: Verify secrets and configmaps
- Resource limits: Check CPU/memory allocation
```

**Database Connection Issues**
```bash
# Check database status
kubectl exec -it <pod-name> -n aicode-staging -- psql $DATABASE_URL -c "SELECT version();"

# Verify connectivity
kubectl exec -it <pod-name> -n aicode-staging -- nc -zv <db-host> 5432
```

### Performance Issues

**High Response Times**
1. Check application metrics in Grafana
2. Review database performance insights
3. Analyze Redis cache hit rates
4. Check Kubernetes resource usage

**Database Performance**
1. Monitor RDS Performance Insights
2. Review slow query logs
3. Check connection pool utilization
4. Analyze read replica usage

### Security Issues

**Failed Security Scans**
1. Review GitHub Security tab
2. Check vulnerability details in Snyk dashboard
3. Prioritize critical and high severity issues
4. Plan remediation with security team

**Authentication Problems**
1. Verify JWT secret configuration
2. Check token expiration settings
3. Review rate limiting configuration
4. Analyze authentication logs

## 🎯 Best Practices

### Development Workflow

1. **Feature Development**
   - Create feature branch from develop
   - Write tests for new functionality
   - Ensure security scan passes
   - Submit PR with comprehensive description

2. **Code Review**
   - Security-focused review
   - Performance impact assessment
   - Test coverage verification
   - Documentation updates

3. **Testing Strategy**
   - Unit tests: >90% coverage
   - Integration tests: All API endpoints
   - E2E tests: Critical user journeys
   - Performance tests: Load and stress testing

### Infrastructure Management

1. **Terraform Best Practices**
   - Use modules for reusability
   - Pin provider versions
   - Implement remote state
   - Tag all resources consistently

2. **Kubernetes Best Practices**
   - Use namespaces for isolation
   - Implement resource quotas
   - Configure health checks
   - Use secrets for sensitive data

3. **Security Best Practices**
   - Principle of least privilege
   - Regular security updates
   - Automated vulnerability scanning
   - Incident response procedures

### Monitoring and Alerting

1. **Metrics Strategy**
   - RED method: Rate, Errors, Duration
   - USE method: Utilization, Saturation, Errors
   - Business metrics alignment
   - SLA/SLO definition and tracking

2. **Alert Configuration**
   - Actionable alerts only
   - Appropriate severity levels
   - Clear escalation procedures
   - Regular alert review and tuning

### Operational Excellence

1. **Change Management**
   - All changes through CI/CD
   - Rollback procedures tested
   - Change documentation required
   - Post-deployment monitoring

2. **Disaster Recovery**
   - Regular backup testing
   - Multi-region failover capability
   - RTO/RPO defined and tested
   - Incident response procedures

3. **Cost Optimization**
   - Regular cost reviews
   - Right-sizing resources
   - Scheduled scaling
   - Reserved instance planning

## 📚 Additional Resources

### Documentation Links
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)

### Training Resources
- AWS EKS Workshop
- Terraform Associate Certification
- Kubernetes Administrator (CKA) Certification
- DevOps Engineer Learning Path

### Support Contacts
- **Platform Team**: platform-team@aicode-platform.com
- **Security Team**: security@aicode-platform.com
- **On-Call**: Use PagerDuty for production incidents

---

**Last Updated**: Generated with Claude Code DevOps Automation
**Version**: 1.0.0
**Maintained By**: Platform Engineering Team