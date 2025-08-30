# Production Deployment Guide

## Overview

This guide covers deploying the AI-Driven Development Platform in production environments. It includes multiple deployment options, from single-server setups to highly available, multi-region enterprise deployments.

---

## Deployment Options

### 1. Docker Compose (Small Teams)
**Recommended for**: 5-25 developers, single region
**Resources**: 4 CPU cores, 16GB RAM, 200GB SSD

### 2. Kubernetes (Medium Organizations)
**Recommended for**: 25-100 developers, high availability required
**Resources**: 8 CPU cores, 32GB RAM, 500GB SSD

### 3. Multi-Region Kubernetes (Enterprise)
**Recommended for**: 100+ developers, global teams, disaster recovery
**Resources**: Distributed across multiple regions

---

## Prerequisites

### System Requirements
```yaml
minimum_requirements:
  compute:
    cpu: "4 cores"
    ram: "16GB"
    storage: "200GB SSD"
  
  database:
    postgres: "14+"
    redis: "7+"
    
  container_runtime:
    docker: "20.10+"
    kubernetes: "1.25+"
    
recommended_requirements:
  compute:
    cpu: "8 cores"
    ram: "32GB"  
    storage: "500GB SSD"
    
  network:
    bandwidth: "1Gbps"
    latency: "<50ms"
```

### Dependencies
- **SSL Certificate**: TLS 1.3 compatible certificate
- **Domain Name**: FQDN for the platform (e.g., aicode.yourcompany.com)
- **SMTP Server**: For email notifications
- **Git Repository**: GitHub, GitLab, or Bitbucket integration
- **Identity Provider**: SAML, OAuth, or LDAP (optional but recommended)

---

## Docker Compose Deployment

### 1. Environment Setup

#### Create Directory Structure
```bash
mkdir -p /opt/aicode/{config,data,logs,backups}
cd /opt/aicode

# Set proper permissions
sudo chown -R $USER:$USER /opt/aicode
chmod 755 /opt/aicode
```

#### Environment Configuration
```bash
# .env.production
NODE_ENV=production
PORT=8080

# Database Configuration
DATABASE_URL=postgresql://aicode:${DB_PASSWORD}@postgres:5432/aicode_prod
POSTGRES_DB=aicode_prod
POSTGRES_USER=aicode
POSTGRES_PASSWORD=${DB_PASSWORD}

# Redis Configuration
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
BCRYPT_ROUNDS=12

# AI Integration
CLAUDE_API_KEY=${CLAUDE_API_KEY}
CLAUDE_API_BASE_URL=https://api.anthropic.com

# GitHub Integration  
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}

# Email Configuration
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090
```

#### Generate Secrets
```bash
# Generate secure secrets
export JWT_SECRET=$(openssl rand -base64 64)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
export DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Save to secure location
echo "JWT_SECRET=$JWT_SECRET" >> /opt/aicode/.env.production
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> /opt/aicode/.env.production  
echo "DB_PASSWORD=$DB_PASSWORD" >> /opt/aicode/.env.production

# Secure the file
chmod 600 /opt/aicode/.env.production
```

### 2. Docker Compose Configuration

#### Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - aicode-api
    restart: unless-stopped

  # Main Application
  aicode-api:
    image: aicode-platform/api:1.0.0
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://aicode:${DB_PASSWORD}@postgres:5432/aicode_prod
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    volumes:
      - ./data/uploads:/app/uploads
      - ./logs/app:/app/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=aicode_prod
      - POSTGRES_USER=aicode
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=en_US.UTF-8 --lc-ctype=en_US.UTF-8
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./config/postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./backups:/backups
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aicode -d aicode_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
      - ./config/redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus:/etc/prometheus:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./config/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  default:
    driver: bridge
```

### 3. Nginx Configuration

#### SSL and Load Balancing
```nginx
# config/nginx.conf
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    upstream aicode_backend {
        server aicode-api:8080;
        keepalive 32;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Main application
    server {
        listen 443 ssl http2;
        server_name aicode.yourcompany.com;

        ssl_certificate /etc/nginx/ssl/aicode.crt;
        ssl_certificate_key /etc/nginx/ssl/aicode.key;

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://aicode_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Authentication endpoints (stricter rate limiting)
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://aicode_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://aicode_backend;
            access_log off;
        }

        # Static files
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 4. Database Configuration

#### PostgreSQL Optimization
```ini
# config/postgres/postgresql.conf
listen_addresses = '*'
port = 5432

# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connections
max_connections = 200
superuser_reserved_connections = 3

# WAL
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB
checkpoint_completion_target = 0.9

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'
log_min_duration_statement = 1000

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200

# Replication
hot_standby = on
max_wal_senders = 3
wal_keep_size = 64
```

### 5. Deployment Process

#### Automated Deployment Script
```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e

echo "🚀 Starting AI Code Platform Production Deployment"
echo "================================================"

# Configuration
PROJECT_DIR="/opt/aicode"
BACKUP_DIR="/opt/aicode/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Check SSL certificates
if [[ ! -f "$PROJECT_DIR/config/ssl/aicode.crt" ]]; then
    echo "❌ SSL certificate not found. Please add certificates to config/ssl/"
    exit 1
fi

# Check environment file
if [[ ! -f "$PROJECT_DIR/.env.production" ]]; then
    echo "❌ Environment file not found. Please create .env.production"
    exit 1
fi

echo "✅ Pre-deployment checks passed"

# Backup existing data
echo "💾 Creating backup..."
mkdir -p "$BACKUP_DIR/$DATE"

# Backup database if running
if docker-compose ps postgres | grep -q "Up"; then
    echo "Backing up database..."
    docker-compose exec -T postgres pg_dump -U aicode aicode_prod > "$BACKUP_DIR/$DATE/database.sql"
fi

# Backup application data
if [[ -d "$PROJECT_DIR/data" ]]; then
    echo "Backing up application data..."
    tar -czf "$BACKUP_DIR/$DATE/app_data.tar.gz" -C "$PROJECT_DIR" data
fi

echo "✅ Backup completed"

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Deploy with zero downtime
echo "🔄 Deploying application..."

# Start new containers
docker-compose -f docker-compose.prod.yml up -d --no-deps

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T aicode-api npm run db:migrate

# Health check
echo "🏥 Running health checks..."
sleep 30

for i in {1..10}; do
    if curl -f http://localhost:8080/health; then
        echo "✅ Application is healthy"
        break
    else
        echo "⏳ Waiting for application to start... ($i/10)"
        sleep 10
    fi
    
    if [[ $i -eq 10 ]]; then
        echo "❌ Health check failed. Rolling back..."
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
done

# Cleanup old containers and images
echo "🧹 Cleaning up..."
docker system prune -f

echo "🎉 Deployment completed successfully!"
echo "📊 Application URL: https://aicode.yourcompany.com"
echo "📈 Monitoring URL: http://localhost:3000 (Grafana)"
echo "📝 Logs: docker-compose -f docker-compose.prod.yml logs -f"
```

---

## Kubernetes Deployment

### 1. Namespace Setup

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aicode-production
  labels:
    name: aicode-production
    environment: production
```

### 2. Configuration Management

#### ConfigMap
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aicode-config
  namespace: aicode-production
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  ENABLE_METRICS: "true"
  METRICS_PORT: "9090"
  POSTGRES_DB: "aicode_prod"
  POSTGRES_USER: "aicode"
  REDIS_URL: "redis://aicode-redis:6379"
```

#### Secrets
```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aicode-secrets
  namespace: aicode-production
type: Opaque
stringData:
  jwt-secret: "your-jwt-secret-here"
  encryption-key: "your-encryption-key-here"
  postgres-password: "your-postgres-password-here"
  claude-api-key: "your-claude-api-key-here"
  github-client-id: "your-github-client-id"
  github-client-secret: "your-github-client-secret"
```

### 3. Database Deployment

#### PostgreSQL StatefulSet
```yaml
# postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: aicode-production
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: aicode-config
              key: POSTGRES_DB
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: aicode-config
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: aicode-secrets
              key: postgres-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - aicode
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - aicode
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

### 4. Application Deployment

#### Main Application
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aicode-api
  namespace: aicode-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aicode-api
  template:
    metadata:
      labels:
        app: aicode-api
    spec:
      containers:
      - name: aicode-api
        image: aicode-platform/api:1.0.0
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: aicode-config
        - secretRef:
            name: aicode-secrets
        env:
        - name: DATABASE_URL
          value: "postgresql://$(POSTGRES_USER):$(postgres-password)@postgres:5432/$(POSTGRES_DB)"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: aicode-uploads-pvc
```

### 5. Service and Ingress

#### Service
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: aicode-api
  namespace: aicode-production
spec:
  selector:
    app: aicode-api
  ports:
  - port: 80
    targetPort: 8080
    name: http
  type: ClusterIP
```

#### Ingress with SSL
```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aicode-ingress
  namespace: aicode-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - aicode.yourcompany.com
    secretName: aicode-tls
  rules:
  - host: aicode.yourcompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aicode-api
            port:
              number: 80
```

### 6. Kubernetes Deployment Script

```bash
#!/bin/bash
# k8s-deploy.sh - Kubernetes deployment script

set -e

NAMESPACE="aicode-production"
KUBECTL_CONTEXT="production-cluster"

echo "🚀 Deploying AI Code Platform to Kubernetes"
echo "==========================================="

# Set kubectl context
kubectl config use-context $KUBECTL_CONTEXT

# Create namespace
echo "📁 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Apply configuration
echo "⚙️  Applying configuration..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy database
echo "🗄️  Deploying database..."
kubectl apply -f k8s/postgres.yaml

# Wait for database to be ready
echo "⏳ Waiting for database..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s

# Deploy application
echo "🏗️  Deploying application..."
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for deployment
echo "⏳ Waiting for deployment..."
kubectl rollout status deployment/aicode-api -n $NAMESPACE

# Run migrations
echo "🔄 Running database migrations..."
kubectl exec -n $NAMESPACE deployment/aicode-api -- npm run db:migrate

# Verify deployment
echo "🔍 Verifying deployment..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

echo "✅ Deployment completed successfully!"
```

---

## Multi-Region Deployment

### 1. Architecture Overview

```yaml
regions:
  primary:
    region: "us-west-2"
    components: [api, database, redis, monitoring]
    traffic_weight: 70
    
  secondary:
    region: "us-east-1" 
    components: [api, database_replica, redis, monitoring]
    traffic_weight: 30
    
  disaster_recovery:
    region: "eu-west-1"
    components: [database_backup, monitoring]
    traffic_weight: 0
```

### 2. Database Replication

#### Master-Slave Setup
```yaml
# postgres-replica.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-replica
  namespace: aicode-production
spec:
  instances: 2
  primaryUpdateStrategy: unsupervised
  
  bootstrap:
    replica:
      enabled: true
      primary: "postgres-primary.us-west-2.cluster.local"
  
  postgresql:
    parameters:
      hot_standby: "on"
      max_standby_streaming_delay: "30s"
      
  monitoring:
    enabled: true
    replicationSlotNames: ["replica_us_east_1"]
```

### 3. Global Load Balancing

#### Route 53 Configuration
```json
{
  "Type": "A",
  "Name": "aicode.yourcompany.com",
  "SetIdentifier": "us-west-2",
  "Failover": "PRIMARY",
  "AliasTarget": {
    "DNSName": "aicode-lb-west.elb.amazonaws.com",
    "EvaluateTargetHealth": true
  }
},
{
  "Type": "A", 
  "Name": "aicode.yourcompany.com",
  "SetIdentifier": "us-east-1",
  "Failover": "SECONDARY",
  "AliasTarget": {
    "DNSName": "aicode-lb-east.elb.amazonaws.com",
    "EvaluateTargetHealth": true
  }
}
```

---

## Post-Deployment Validation

### 1. Automated Testing

```bash
#!/bin/bash
# post-deploy-validation.sh

BASE_URL="https://aicode.yourcompany.com"
API_KEY="your-api-key"

echo "🧪 Running post-deployment validation tests"
echo "=========================================="

# Health check
echo "🏥 Testing health endpoint..."
if curl -f "$BASE_URL/health"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# API authentication
echo "🔐 Testing API authentication..."
if curl -f -H "Authorization: Bearer $API_KEY" "$BASE_URL/api/v1/users/me"; then
    echo "✅ API authentication works"
else
    echo "❌ API authentication failed"
    exit 1
fi

# Database connectivity
echo "🗄️  Testing database connectivity..."
if curl -f "$BASE_URL/api/v1/health/db"; then
    echo "✅ Database connectivity works"
else
    echo "❌ Database connectivity failed"
    exit 1
fi

# AI integration
echo "🤖 Testing AI integration..."
if curl -f -X POST -H "Authorization: Bearer $API_KEY" \
   -H "Content-Type: application/json" \
   -d '{"test": "ai_health_check"}' \
   "$BASE_URL/api/v1/ai/health"; then
    echo "✅ AI integration works"
else
    echo "❌ AI integration failed"
    exit 1
fi

echo "✅ All validation tests passed!"
```

### 2. Performance Testing

```bash
#!/bin/bash
# performance-test.sh

echo "⚡ Running performance tests..."

# Load test with Apache Bench
ab -n 1000 -c 10 https://aicode.yourcompany.com/health

# API performance test
ab -n 500 -c 5 -H "Authorization: Bearer $API_KEY" \
   https://aicode.yourcompany.com/api/v1/projects

echo "📊 Performance test completed"
```

---

## Monitoring Setup

### 1. Application Metrics

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      
    scrape_configs:
      - job_name: 'aicode-api'
        static_configs:
          - targets: ['aicode-api:9090']
        scrape_interval: 30s
        metrics_path: /metrics
        
      - job_name: 'postgres'
        static_configs:
          - targets: ['postgres-exporter:9187']
          
      - job_name: 'redis'
        static_configs:
          - targets: ['redis-exporter:9121']
    
    rule_files:
      - "alert-rules.yml"
      
    alerting:
      alertmanagers:
        - static_configs:
            - targets: ['alertmanager:9093']
```

### 2. Alert Rules

```yaml
# alert-rules.yml
groups:
- name: aicode-platform
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected
      
  - alert: DatabaseDown
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: Database is down
      
  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemFree_bytes) / node_memory_MemTotal_bytes > 0.9
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: High memory usage detected
```

---

## Backup and Recovery

### 1. Automated Backup Script

```bash
#!/bin/bash
# backup.sh - Automated backup script

BACKUP_DIR="/opt/backups/aicode"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR/$DATE"

echo "💾 Starting backup process..."

# Database backup
echo "Backing up database..."
docker-compose exec -T postgres pg_dump -U aicode aicode_prod > "$BACKUP_DIR/$DATE/database.sql"

# Application data backup
echo "Backing up application data..."
tar -czf "$BACKUP_DIR/$DATE/app_data.tar.gz" -C /opt/aicode data

# Configuration backup
echo "Backing up configuration..."
tar -czf "$BACKUP_DIR/$DATE/config.tar.gz" -C /opt/aicode config .env.production

# Upload to S3 (optional)
if [[ -n "$AWS_S3_BUCKET" ]]; then
    echo "Uploading to S3..."
    aws s3 sync "$BACKUP_DIR/$DATE" "s3://$AWS_S3_BUCKET/backups/$DATE/"
fi

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "✅ Backup completed successfully"
```

### 2. Recovery Procedures

```bash
#!/bin/bash
# restore.sh - Database and application restore

BACKUP_DATE=${1:-$(ls -1 /opt/backups/aicode | tail -1)}
BACKUP_DIR="/opt/backups/aicode/$BACKUP_DATE"

echo "🔄 Starting restore from backup: $BACKUP_DATE"

# Stop application
docker-compose down

# Restore database
echo "Restoring database..."
docker-compose up -d postgres
sleep 30
cat "$BACKUP_DIR/database.sql" | docker-compose exec -T postgres psql -U aicode aicode_prod

# Restore application data
echo "Restoring application data..."
tar -xzf "$BACKUP_DIR/app_data.tar.gz" -C /opt/aicode

# Restore configuration
echo "Restoring configuration..."
tar -xzf "$BACKUP_DIR/config.tar.gz" -C /opt/aicode

# Start application
docker-compose up -d

echo "✅ Restore completed successfully"
```

---

## Troubleshooting

### Common Deployment Issues

#### SSL Certificate Problems
```bash
# Check certificate validity
openssl x509 -in /opt/aicode/config/ssl/aicode.crt -text -noout

# Verify certificate chain
openssl verify -CAfile /opt/aicode/config/ssl/ca-chain.crt /opt/aicode/config/ssl/aicode.crt
```

#### Database Connection Issues
```bash
# Test database connection
docker-compose exec postgres psql -U aicode -d aicode_prod -c "SELECT version();"

# Check database logs
docker-compose logs postgres

# Reset database password
docker-compose exec postgres psql -U aicode -c "ALTER USER aicode PASSWORD 'newpassword';"
```

#### Application Startup Problems
```bash
# Check application logs
docker-compose logs aicode-api

# Verify environment variables
docker-compose exec aicode-api env | grep -E "(NODE_ENV|DATABASE_URL|JWT_SECRET)"

# Test database migration
docker-compose exec aicode-api npm run db:migrate
```

For additional troubleshooting help, see our [Troubleshooting Guide](../troubleshooting/common-issues.md).