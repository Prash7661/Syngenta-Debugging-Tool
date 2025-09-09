#!/bin/bash

# Health check script for container orchestration
set -e

# Configuration
HOST=${1:-localhost}
PORT=${2:-3000}
TIMEOUT=${3:-10}
MAX_RETRIES=${4:-3}

echo "Performing health check on $HOST:$PORT"

# Function to check health endpoint
check_health() {
  local endpoint=$1
  local expected_status=${2:-200}
  
  echo "Checking $endpoint..."
  
  response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json \
    --max-time $TIMEOUT \
    "http://$HOST:$PORT$endpoint" || echo "000")
  
  if [ "$response" = "$expected_status" ]; then
    echo "✓ $endpoint: OK ($response)"
    return 0
  else
    echo "✗ $endpoint: FAILED ($response)"
    if [ -f /tmp/health_response.json ]; then
      echo "Response body:"
      cat /tmp/health_response.json
      echo ""
    fi
    return 1
  fi
}

# Function to perform health checks with retries
health_check_with_retry() {
  local endpoint=$1
  local expected_status=${2:-200}
  local retries=0
  
  while [ $retries -lt $MAX_RETRIES ]; do
    if check_health "$endpoint" "$expected_status"; then
      return 0
    fi
    
    retries=$((retries + 1))
    if [ $retries -lt $MAX_RETRIES ]; then
      echo "Retrying in 2 seconds... (attempt $((retries + 1))/$MAX_RETRIES)"
      sleep 2
    fi
  done
  
  return 1
}

# Perform health checks
echo "Starting health checks..."

# Basic health check
if ! health_check_with_retry "/api/health"; then
  echo "Basic health check failed"
  exit 1
fi

# Liveness probe
if ! health_check_with_retry "/api/health/live"; then
  echo "Liveness probe failed"
  exit 1
fi

# Readiness probe
if ! health_check_with_retry "/api/health/ready"; then
  echo "Readiness probe failed"
  exit 1
fi

# System health check
if ! health_check_with_retry "/api/health/system"; then
  echo "System health check failed"
  exit 1
fi

echo "All health checks passed successfully!"

# Optional: Show detailed health information
if [ "$VERBOSE" = "true" ]; then
  echo ""
  echo "Detailed health information:"
  curl -s "http://$HOST:$PORT/api/health" | jq '.' 2>/dev/null || cat
fi

exit 0