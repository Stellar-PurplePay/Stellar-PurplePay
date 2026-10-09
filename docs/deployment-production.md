# Production Deployment Guide

This guide covers deploying Stellar PurplePay to production on AWS, GCP, or DigitalOcean.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Redis Setup](#redis-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Contract Deployment](#contract-deployment)
- [Go-Live Checklist](#go-live-checklist)
- [Provider-Specific Guides](#provider-specific-guides)
  - [AWS (ECS + RDS)](#aws-ecs--rds)
  - [GCP (Cloud Run + Cloud SQL)](#gcp-cloud-run--cloud-sql)
  - [DigitalOcean (App Platform)](#digitalocean-app-platform)
- [Cost Estimates](#cost-estimates)

---

## Prerequisites

Before deploying to production, ensure you have:

- [ ] Domain name configured (e.g., `stellarpurplepay.com`)
- [ ] SSL certificate (Let's Encrypt or provider certificate)
- [ ] Stellar mainnet account with sufficient XLM
- [ ] Production database backup strategy
- [ ] Monitoring and alerting set up
- [ ] API keys for third-party services (Pinata, SMTP, etc.)
- [ ] CI/CD pipeline configured (GitHub Actions)

---

## Environment Variables

### Backend Environment Variables

Required for production:

```env
# Server
NODE_ENV=production
PORT=4000
BASE_URL=https://stellarpurplepay.com
API_BASE_URL=https://api.stellarpurplepay.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/stellarwork_prod

# JWT Secret (min 32 characters)
JWT_SECRET=your-super-secret-key-min-32-characters-long-replace-this

# Stellar Network
STELLAR_NETWORK=mainnet
HORIZON_URL=https://horizon.stellar.org
SOROBAN_RPC_URL=https://soroban.stellar.org
CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# CORS
ALLOWED_ORIGINS=https://stellarpurplepay.com,https://www.stellarpurplepay.com

# Redis
REDIS_HOST=your-redis-host.redis.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Admin Accounts
ADMIN_WALLET_ADDRESSES=GXXXX...,GYYYY...

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@stellarpurplepay.com

# Pinata IPFS
PINATA_API_KEY=your_api_key
PINATA_API_SECRET=your_api_secret
PINATA_JWT=your_jwt_token

# Frontend URL (for emails)
FRONTEND_URL=https://stellarpurplepay.com
```

### Frontend Environment Variables

```env
# API
NEXT_PUBLIC_API_URL=https://api.stellarpurplepay.com

# Stellar Network
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban.stellar.org
NEXT_PUBLIC_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Contract Mock (set to false in production)
NEXT_PUBLIC_USE_CONTRACT_MOCK=false

# Pinata
NEXT_PUBLIC_PINATA_API_KEY=your_api_key
```

---

## Database Setup

### 1. Create Production Database

#### PostgreSQL Requirements

- **Version**: PostgreSQL 14+ recommended
- **Storage**: 20GB minimum (grows with data)
- **RAM**: 2GB minimum
- **Connections**: 100 concurrent connections minimum

#### Manual Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# Create production database and user
CREATE DATABASE stellarwork_prod;
CREATE USER stellarwork_prod WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE stellarwork_prod TO stellarwork_prod;

# Enable required extensions
\c stellarwork_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\q
```

### 2. Run Migrations

```bash
cd backend

# Set production DATABASE_URL
export DATABASE_URL="postgresql://stellarwork_prod:PASSWORD@host:5432/stellarwork_prod"

# Run migrations
npm run migrate
```

Output should show all migrations completed:
```
✅ Running migration V1__initial_schema.up.sql
✅ Running migration V2__admin_2fa_and_drafts.up.sql
...
✅ All migrations completed successfully
```

### 3. Verify Tables

```bash
psql "$DATABASE_URL" -c "\dt"
```

Should list all tables: `jobs`, `applications`, `users`, `escrows`, etc.

### 4. Database Backup

Set up automated daily backups:

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgresql"
DB_NAME="stellarwork_prod"

mkdir -p $BACKUP_DIR

pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

Add to crontab:
```bash
0 2 * * * /path/to/backup-script.sh
```

### 5. Database Performance

```sql
-- Add indexes for performance
CREATE INDEX CONCURRENTLY idx_jobs_created_at_id ON jobs(created_at DESC, id DESC);
CREATE INDEX CONCURRENTLY idx_applications_job_id ON applications(job_id);
CREATE INDEX CONCURRENTLY idx_escrows_status ON escrows(status);
CREATE INDEX CONCURRENTLY idx_messages_recipient ON private_messages(recipient_address);

-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Redis Setup

### 1. Redis Requirements

- **Version**: Redis 6.2+ or Redis 7+
- **Memory**: 1GB minimum
- **Persistence**: RDB snapshots enabled
- **TLS**: Enabled in production

### 2. Redis Configuration

```conf
# redis.conf (production)
bind 0.0.0.0
protected-mode yes
requirepass STRONG_PASSWORD_HERE
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. Test Redis Connection

```bash
redis-cli -h your-redis-host -p 6379 -a your-password ping
# Should return: PONG
```

### 4. Redis Monitoring

```bash
# Monitor Redis performance
redis-cli -h your-redis-host -a your-password INFO memory

# Watch commands in real-time
redis-cli -h your-redis-host -a your-password MONITOR
```

---

## SSL/TLS Configuration

### 1. Obtain SSL Certificate

#### Option A: Let's Encrypt (Free)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d stellarpurplepay.com -d www.stellarpurplepay.com
```

Certificates will be in: `/etc/letsencrypt/live/stellarpurplepay.com/`

#### Option B: Provider Certificate

- AWS: Use AWS Certificate Manager (ACM)
- GCP: Use Google-managed SSL
- DigitalOcean: Use managed certificates

### 2. Configure Nginx

```nginx
# /etc/nginx/sites-available/stellarpurplepay

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name stellarpurplepay.com www.stellarpurplepay.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name stellarpurplepay.com www.stellarpurplepay.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/stellarpurplepay.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stellarpurplepay.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/stellarpurplepay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Auto-Renew Certificate

```bash
# Add to crontab
sudo crontab -e

# Renew certificate daily (certbot checks if renewal needed)
0 0 * * * certbot renew --quiet && systemctl reload nginx
```

---

## Contract Deployment

Deploy Soroban smart contracts to mainnet.

### 1. Build Contract

```bash
cd contracts
make build
```

### 2. Generate Mainnet Keypair

```bash
# Generate new keypair for contract deployer
stellar keys generate deployer --network mainnet

# Fund account (requires existing mainnet XLM)
# Send XLM from another account to deployer public key
```

### 3. Deploy Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.wasm \
  --network mainnet \
  --source deployer

# Output: CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Save this contract ID!
```

### 4. Verify Contract

```bash
# Test contract on mainnet
stellar contract invoke \
  --id CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --network mainnet \
  --source deployer \
  -- \
  get_version

# Should return contract version
```

### 5. Update Environment Variables

```bash
# Backend
echo "CONTRACT_ID=CXXXXXX..." >> backend/.env.production

# Frontend
echo "NEXT_PUBLIC_CONTRACT_ID=CXXXXXX..." >> frontend/.env.production
```

See [contract-deployment.md](./contract-deployment.md) for detailed instructions.

---

## Go-Live Checklist

Before launching to production:

### Security
- [ ] All environment variables set with strong passwords
- [ ] SSL/TLS certificates configured
- [ ] CORS origins restricted to production domains
- [ ] JWT secret is strong (32+ characters)
- [ ] Redis password protection enabled
- [ ] Database uses strong password
- [ ] Admin accounts configured
- [ ] Rate limiting enabled
- [ ] Security headers configured in Nginx

### Infrastructure
- [ ] Database backups automated
- [ ] Redis persistence enabled
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] CDN configured for static assets
- [ ] Health check endpoints working
- [ ] Auto-scaling configured (if applicable)

### Application
- [ ] All migrations run successfully
- [ ] Contract deployed to mainnet
- [ ] SMTP email working
- [ ] Pinata IPFS configured
- [ ] Frontend builds without errors
- [ ] Backend API responds correctly
- [ ] WebSocket connections working

### Testing
- [ ] Create test job on mainnet
- [ ] Apply to job as freelancer
- [ ] Complete full job lifecycle
- [ ] Test payments/escrow
- [ ] Test private messaging
- [ ] Test dispute resolution
- [ ] Load test with expected traffic

### Documentation
- [ ] README updated with production info
- [ ] API documentation published
- [ ] Troubleshooting guide accessible
- [ ] Contact information for support

---

## Provider-Specific Guides

### AWS (ECS + RDS)

#### Architecture

```
Internet → ALB → ECS Service (Frontend + Backend)
                        ↓
                    RDS PostgreSQL
                    ElastiCache Redis
```

#### IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "rds:*",
        "elasticache:*",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "elasticloadbalancing:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Setup Steps

**1. Create VPC**

```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16
```

**2. Create RDS PostgreSQL**

```bash
aws rds create-db-instance \
  --db-instance-identifier stellarpurplepay-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username stellarwork \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name my-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted
```

**3. Create ElastiCache Redis**

```bash
aws elasticache create-replication-group \
  --replication-group-id stellarpurplepay-redis \
  --replication-group-description "Stellar PurplePay Cache" \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --auth-token YOUR_REDIS_PASSWORD
```

**4. Create ECS Cluster**

```bash
aws ecs create-cluster --cluster-name stellarpurplepay
```

**5. Create Task Definition**

```json
{
  "family": "stellarpurplepay",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-registry/stellarpurplepay-backend:latest",
      "portMappings": [{"containerPort": 4000, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "4000"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/stellarpurplepay",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ]
}
```

**6. Create Service**

```bash
aws ecs create-service \
  --cluster stellarpurplepay \
  --service-name backend \
  --task-definition stellarpurplepay \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=4000"
```

#### Cost Estimate (Monthly)

| Service | Configuration | Cost |
|---------|--------------|------|
| ECS Fargate | 2 tasks × 0.5 vCPU × 1GB RAM | ~$30 |
| RDS PostgreSQL | db.t3.micro (1 vCPU, 1GB RAM) | ~$15 |
| ElastiCache Redis | cache.t3.micro (0.5 GB) | ~$12 |
| Application Load Balancer | 1 ALB | ~$22 |
| Data Transfer | 100GB outbound | ~$9 |
| **Total** | | **~$88/month** |

---

### GCP (Cloud Run + Cloud SQL)

#### Architecture

```
Internet → Cloud Load Balancer → Cloud Run (Frontend + Backend)
                                        ↓
                                  Cloud SQL PostgreSQL
                                  Memorystore Redis
```

#### Service Account Permissions

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/redis.editor"
```

#### Setup Steps

**1. Create Cloud SQL Instance**

```bash
gcloud sql instances create stellarpurplepay-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_PASSWORD \
  --backup \
  --backup-start-time=02:00

# Create database
gcloud sql databases create stellarwork_prod --instance=stellarpurplepay-db

# Create user
gcloud sql users create stellarwork \
  --instance=stellarpurplepay-db \
  --password=YOUR_PASSWORD
```

**2. Create Memorystore Redis**

```bash
gcloud redis instances create stellarpurplepay-redis \
  --size=1 \
  --region=us-central1 \
  --tier=standard \
  --redis-version=redis_6_x
```

**3. Deploy Backend to Cloud Run**

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/stellarpurplepay-backend backend/

# Deploy to Cloud Run
gcloud run deploy stellarpurplepay-backend \
  --image gcr.io/PROJECT_ID/stellarpurplepay-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:us-central1:stellarpurplepay-db \
  --set-env-vars "NODE_ENV=production,PORT=4000" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

**4. Deploy Frontend to Cloud Run**

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/stellarpurplepay-frontend frontend/

# Deploy to Cloud Run
gcloud run deploy stellarpurplepay-frontend \
  --image gcr.io/PROJECT_ID/stellarpurplepay-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://api.stellarpurplepay.com" \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

**5. Configure Load Balancer**

```bash
# Create backend service
gcloud compute backend-services create stellarpurplepay-backend \
  --global \
  --load-balancing-scheme=EXTERNAL

# Add Cloud Run backend
gcloud compute backend-services add-backend stellarpurplepay-backend \
  --global \
  --network-endpoint-group=CLOUD_RUN_NEG

# Create URL map
gcloud compute url-maps create stellarpurplepay \
  --default-service stellarpurplepay-frontend

# Add path matcher for API
gcloud compute url-maps add-path-matcher stellarpurplepay \
  --path-matcher-name=api \
  --default-service=stellarpurplepay-backend \
  --path-rules="/api/*=stellarpurplepay-backend"

# Create HTTPS proxy
gcloud compute target-https-proxies create stellarpurplepay-proxy \
  --url-map=stellarpurplepay \
  --ssl-certificates=SSL_CERT

# Create forwarding rule
gcloud compute forwarding-rules create stellarpurplepay-https \
  --global \
  --target-https-proxy=stellarpurplepay-proxy \
  --ports=443
```

#### Cost Estimate (Monthly)

| Service | Configuration | Cost |
|---------|--------------|------|
| Cloud Run Backend | 1 vCPU × 1GB RAM, 1M requests | ~$25 |
| Cloud Run Frontend | 1 vCPU × 512MB RAM, 1M requests | ~$15 |
| Cloud SQL | db-f1-micro (0.6GB RAM) | ~$10 |
| Memorystore Redis | 1GB standard | ~$40 |
| Load Balancer | Forwarding rules + traffic | ~$20 |
| **Total** | | **~$110/month** |

---

### DigitalOcean (App Platform)

#### Architecture

```
Internet → App Platform (Auto-scaling)
                ↓
          Managed PostgreSQL
          Managed Redis
```

#### Setup Steps

**1. Create Managed PostgreSQL**

```bash
doctl databases create stellarpurplepay-db \
  --engine pg \
  --version 14 \
  --size db-s-1vcpu-1gb \
  --region nyc3 \
  --num-nodes 1
```

**2. Create Managed Redis**

```bash
doctl databases create stellarpurplepay-redis \
  --engine redis \
  --version 7 \
  --size db-s-1vcpu-1gb \
  --region nyc3
```

**3. Create App Spec**

```yaml
# app.yaml
name: stellarpurplepay
region: nyc

databases:
  - name: stellarpurplepay-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb
  - name: stellarpurplepay-redis
    engine: REDIS
    version: "7"
    size: db-s-1vcpu-1gb

services:
  - name: backend
    github:
      repo: Stellar-PurplePay/Stellar-PurplePay
      branch: main
      deploy_on_push: true
    source_dir: /backend
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 4000
    instance_count: 2
    instance_size_slug: basic-xs
    envs:
      - key: NODE_ENV
        value: "production"
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: JWT_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: REDIS_HOST
        scope: RUN_TIME
        type: SECRET
    routes:
      - path: /api
      - path: /ws

  - name: frontend
    github:
      repo: Stellar-PurplePay/Stellar-PurplePay
      branch: main
      deploy_on_push: true
    source_dir: /frontend
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 3000
    instance_count: 2
    instance_size_slug: basic-xs
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: "https://api.stellarpurplepay.com"
      - key: NEXT_PUBLIC_CONTRACT_ID
        value: "CXXXXXXX..."
    routes:
      - path: /

domains:
  - domain: stellarpurplepay.com
    type: PRIMARY
  - domain: www.stellarpurplepay.com
    type: ALIAS
```

**4. Deploy App**

```bash
# Via CLI
doctl apps create --spec app.yaml

# Or via UI
# 1. Go to DigitalOcean control panel
# 2. Click "Apps" → "Create App"
# 3. Connect GitHub repository
# 4. Configure app spec
# 5. Click "Create"
```

**5. Configure Environment Variables**

```bash
# Set secrets
doctl apps update APP_ID \
  --spec app.yaml

# Or via UI:
# Settings → App-Level Environment Variables → Add Variable
```

#### Cost Estimate (Monthly)

| Service | Configuration | Cost |
|---------|--------------|------|
| App Platform Backend | 2 × basic-xs (512MB RAM) | ~$10 |
| App Platform Frontend | 2 × basic-xs (512MB RAM) | ~$10 |
| Managed PostgreSQL | db-s-1vcpu-1gb | ~$15 |
| Managed Redis | db-s-1vcpu-1gb | ~$15 |
| Bandwidth | 1TB | Included |
| **Total** | | **~$50/month** |

---

## Cost Estimates Summary

| Provider | Monthly Cost | Best For |
|----------|-------------|----------|
| **DigitalOcean** | ~$50 | Simple setup, low traffic, small teams |
| **AWS** | ~$88 | Enterprise, fine-grained control, existing AWS infrastructure |
| **GCP** | ~$110 | Auto-scaling, Cloud Run serverless, global reach |

**Notes**:
- Costs include smallest production-ready instances
- Traffic estimates: 100K requests/month, 100GB data transfer
- Costs increase with traffic, storage, and additional features
- Free tiers may reduce initial costs

---

## Post-Deployment

### Monitoring

Set up monitoring for:

- **Uptime**: [UptimeRobot](https://uptimerobot.com) or [Pingdom](https://www.pingdom.com)
- **Errors**: [Sentry](https://sentry.io) for error tracking
- **Logs**: Centralized logging (CloudWatch, Stackdriver, Papertrail)
- **Metrics**: Application metrics (response time, throughput, errors)

### Backups

- **Database**: Daily automated backups with 30-day retention
- **Redis**: RDB snapshots every 6 hours
- **Contract**: Keep deployed WASM files in version control
- **Environment**: Store encrypted environment variables in secrets manager

### Scaling

Monitor and scale as traffic grows:

- **Horizontal Scaling**: Add more backend instances
- **Database**: Upgrade to larger instance or read replicas
- **Redis**: Upgrade to cluster mode
- **CDN**: Add CloudFlare or AWS CloudFront for static assets

---

## Support

For deployment issues:

- **Documentation**: [docs/](.)
- **Troubleshooting**: [troubleshooting.md](./troubleshooting.md)
- **Issues**: [github.com/stellar-purplepay/issues](https://github.com/stellar-purplepay/issues)

---

**Last Updated**: 2026-05-28
