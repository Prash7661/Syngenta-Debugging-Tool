# SFMC Development Suite - Deployment Guide

This guide covers the deployment of the SFMC Development Suite using Docker and Kubernetes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Health Checks](#health-checks)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- kubectl (for Kubernetes deployment)
- Helm 3+ (optional, for advanced Kubernetes deployments)

### Required Services

- Redis 7+ (for session storage and caching)
- OpenAI API access (for AI code generation)
- SFMC API credentials (for SFMC integration)

## Environment Configuration

### Environment Variables

Copy `.env.example` to create environment-specific configuration files:

```bash
cp .env.example .env.production
cp .env.example .env.staging
cp .env.example .env.development
```

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for code generation | Yes |
| `SFMC_CLIENT_ID` | SFMC OAuth client ID | Yes |
| `SFMC_CLIENT_SECRET` | SFMC OAuth client secret | Yes |
| `SFMC_SUBDOMAIN` | SFMC subdomain | Yes |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `ENCRYPTION_KEY` | 32-character key for data encryption | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `REDIS_PASSWORD` | Redis password (if required) | No |

### Security Considerations

- Use strong, unique secrets for production
- Store secrets securely (e.g., AWS Secrets Manager, Azure Key Vault)
- Rotate secrets regularly
- Use different secrets for each environment

## Docker Deployment

### Quick Start

1. **Build the Docker image:**
   ```bash
   ./scripts/docker-build.sh production latest
   ```

2. **Start the application:**
   ```bash
   ./scripts/docker-run.sh production
   ```

3. **Verify deployment:**
   ```bash
   ./scripts/health-check.sh localhost 3000
   ```

### Environment-Specific Deployment

#### Development Environment

```bash
# Build development image
./scripts/docker-build.sh development

# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

#### Staging Environment

```bash
# Build staging image
./scripts/docker-build.sh staging

# Start staging environment
docker-compose -f docker-compose.staging.yml up -d

# Scale to multiple instances
docker-compose -f docker-compose.staging.yml up -d --scale app=3
```

#### Production Environment

```bash
# Build production image
./scripts/docker-build.sh production

# Start production environment
docker-compose -f docker-compose.yml up -d

# Monitor health
watch -n 30 './scripts/health-check.sh localhost 3000'
```

### Docker Compose Services

The deployment includes the following services:

- **app**: Main SFMC Development Suite application
- **redis**: Redis cache and session store

### Volume Management

- **redis_data**: Persistent storage for Redis data
- Application logs are written to stdout/stderr for container log aggregation

## Kubernetes Deployment

### Prerequisites

1. **Kubernetes cluster** (1.20+)
2. **kubectl** configured to access your cluster
3. **Ingress controller** (nginx recommended)
4. **Cert-manager** (for TLS certificates)

### Quick Start

1. **Deploy to Kubernetes:**
   ```bash
   ./scripts/k8s-deploy.sh production
   ```

2. **Access the application:**
   ```bash
   kubectl port-forward svc/sfmc-dev-suite-service 3000:80 -n sfmc-development-suite
   ```

3. **Visit:** http://localhost:3000

### Manual Deployment Steps

1. **Create namespace:**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   ```

2. **Configure secrets:**
   ```bash
   # Update k8s/secret.yaml with base64-encoded values
   echo -n "your-api-key" | base64
   kubectl apply -f k8s/secret.yaml
   ```

3. **Apply configuration:**
   ```bash
   kubectl apply -f k8s/configmap.yaml
   ```

4. **Deploy Redis:**
   ```bash
   kubectl apply -f k8s/redis-deployment.yaml
   ```

5. **Deploy application:**
   ```bash
   kubectl apply -f k8s/app-deployment.yaml
   ```

6. **Enable auto-scaling:**
   ```bash
   kubectl apply -f k8s/hpa.yaml
   ```

### Kubernetes Resources

#### Deployments

- **sfmc-dev-suite-deployment**: Main application (3 replicas)
- **redis-deployment**: Redis cache (1 replica)

#### Services

- **sfmc-dev-suite-service**: Application service (port 80)
- **redis-service**: Redis service (port 6379)

#### ConfigMaps and Secrets

- **sfmc-dev-suite-config**: Application configuration
- **sfmc-dev-suite-secrets**: Sensitive credentials

#### Ingress

- **sfmc-dev-suite-ingress**: External access with TLS

### Scaling

#### Manual Scaling

```bash
# Scale application pods
kubectl scale deployment sfmc-dev-suite-deployment --replicas=5 -n sfmc-development-suite

# Check scaling status
kubectl get hpa -n sfmc-development-suite
```

#### Auto-scaling

The HPA (Horizontal Pod Autoscaler) automatically scales based on:

- CPU utilization (target: 70%)
- Memory utilization (target: 80%)
- Min replicas: 3
- Max replicas: 10

## Health Checks

### Health Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/api/health` | Basic health check | General monitoring |
| `/api/health/live` | Liveness probe | Kubernetes liveness |
| `/api/health/ready` | Readiness probe | Kubernetes readiness |
| `/api/health/system` | System health | Detailed monitoring |

### Health Check Script

```bash
# Basic health check
./scripts/health-check.sh localhost 3000

# Verbose health check
VERBOSE=true ./scripts/health-check.sh localhost 3000

# Health check with custom timeout
./scripts/health-check.sh localhost 3000 30 5
```

### Kubernetes Health Checks

The Kubernetes deployment includes:

- **Startup Probe**: Checks if application has started (12 attempts, 5s interval)
- **Liveness Probe**: Checks if application is alive (30s interval)
- **Readiness Probe**: Checks if application is ready to serve traffic (10s interval)

## Monitoring

### Metrics Collection

The application exposes metrics on port 9090:

- Application performance metrics
- Health check metrics
- Custom business metrics

### Logging

Logs are structured JSON format with the following levels:

- **debug**: Detailed debugging information
- **info**: General information
- **warn**: Warning conditions
- **error**: Error conditions

### Log Aggregation

#### Docker

```bash
# View application logs
docker-compose logs -f app

# View Redis logs
docker-compose logs -f redis
```

#### Kubernetes

```bash
# View application logs
kubectl logs -f deployment/sfmc-dev-suite-deployment -n sfmc-development-suite

# View logs from all pods
kubectl logs -f -l app=sfmc-dev-suite -n sfmc-development-suite

# View Redis logs
kubectl logs -f deployment/redis-deployment -n sfmc-development-suite
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms:**
- Container exits immediately
- Health checks fail

**Solutions:**
```bash
# Check logs
docker-compose logs app

# Verify environment variables
docker-compose exec app env | grep -E "(OPENAI|SFMC|REDIS)"

# Test Redis connection
docker-compose exec app redis-cli -h redis ping
```

#### 2. High Memory Usage

**Symptoms:**
- Pods getting OOMKilled
- High memory utilization

**Solutions:**
```bash
# Check memory usage
kubectl top pods -n sfmc-development-suite

# Increase memory limits
kubectl patch deployment sfmc-dev-suite-deployment -n sfmc-development-suite -p '{"spec":{"template":{"spec":{"containers":[{"name":"sfmc-dev-suite","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

#### 3. Redis Connection Issues

**Symptoms:**
- Session data not persisting
- Cache misses

**Solutions:**
```bash
# Check Redis status
kubectl exec -it deployment/redis-deployment -n sfmc-development-suite -- redis-cli ping

# Check Redis logs
kubectl logs deployment/redis-deployment -n sfmc-development-suite

# Verify Redis service
kubectl get svc redis-service -n sfmc-development-suite
```

#### 4. SFMC API Issues

**Symptoms:**
- Authentication failures
- API rate limiting

**Solutions:**
```bash
# Check SFMC credentials
kubectl get secret sfmc-dev-suite-secrets -n sfmc-development-suite -o yaml

# Test SFMC connectivity
kubectl exec -it deployment/sfmc-dev-suite-deployment -n sfmc-development-suite -- curl -v https://your-subdomain.auth.marketingcloudapis.com
```

### Debug Commands

#### Docker

```bash
# Enter container shell
docker-compose exec app sh

# Check container resources
docker stats

# Inspect container
docker inspect sfmc-dev-suite_app_1
```

#### Kubernetes

```bash
# Describe pod
kubectl describe pod -l app=sfmc-dev-suite -n sfmc-development-suite

# Get pod shell
kubectl exec -it deployment/sfmc-dev-suite-deployment -n sfmc-development-suite -- sh

# Check resource usage
kubectl top pods -n sfmc-development-suite

# View events
kubectl get events -n sfmc-development-suite --sort-by='.lastTimestamp'
```

### Performance Tuning

#### Application Tuning

1. **Memory Settings:**
   ```bash
   # Set Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=1024"
   ```

2. **Redis Optimization:**
   ```bash
   # Redis memory policy
   maxmemory-policy allkeys-lru
   ```

3. **Connection Pooling:**
   - Configure appropriate connection pool sizes
   - Monitor connection usage

#### Kubernetes Resource Limits

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Backup and Recovery

#### Redis Data Backup

```bash
# Create Redis backup
kubectl exec deployment/redis-deployment -n sfmc-development-suite -- redis-cli BGSAVE

# Copy backup file
kubectl cp sfmc-development-suite/redis-pod:/data/dump.rdb ./redis-backup.rdb
```

#### Application State Backup

- Session data is stored in Redis
- Configuration is in ConfigMaps and Secrets
- No persistent application state to backup

### Security Hardening

1. **Container Security:**
   - Run as non-root user
   - Read-only root filesystem where possible
   - Drop unnecessary capabilities

2. **Network Security:**
   - Use network policies to restrict traffic
   - Enable TLS for all external communications

3. **Secret Management:**
   - Use external secret management systems
   - Rotate secrets regularly
   - Audit secret access

For additional support, check the application logs and health endpoints for detailed error information.