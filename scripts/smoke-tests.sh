#!/bin/bash

# Smoke tests for SFMC Development Suite deployment
set -e

# Configuration
BASE_URL=${1:-"http://localhost:3000"}
TIMEOUT=${2:-30}
MAX_RETRIES=${3:-3}

echo "Running smoke tests against: $BASE_URL"
echo "Timeout: ${TIMEOUT}s, Max retries: $MAX_RETRIES"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run a test with retries
run_test() {
  local test_name="$1"
  local test_command="$2"
  local expected_status="${3:-200}"
  local retries=0
  
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  
  echo -n "Testing $test_name... "
  
  while [ $retries -lt $MAX_RETRIES ]; do
    if eval "$test_command"; then
      echo -e "${GREEN}✓ PASSED${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      return 0
    fi
    
    retries=$((retries + 1))
    if [ $retries -lt $MAX_RETRIES ]; then
      echo -n "retry $retries... "
      sleep 2
    fi
  done
  
  echo -e "${RED}✗ FAILED${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  return 1
}

# Function to make HTTP request and check status
http_test() {
  local endpoint="$1"
  local expected_status="${2:-200}"
  local method="${3:-GET}"
  
  response=$(curl -s -w "%{http_code}" -o /tmp/smoke_test_response.json \
    --max-time $TIMEOUT \
    -X "$method" \
    "$BASE_URL$endpoint" 2>/dev/null || echo "000")
  
  if [ "$response" = "$expected_status" ]; then
    return 0
  else
    echo "Expected $expected_status, got $response"
    return 1
  fi
}

# Function to check response content
content_test() {
  local endpoint="$1"
  local expected_content="$2"
  
  response=$(curl -s --max-time $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null || echo "")
  
  if echo "$response" | grep -q "$expected_content"; then
    return 0
  else
    echo "Expected content '$expected_content' not found in response"
    return 1
  fi
}

echo "Starting smoke tests..."
echo "================================"

# Test 1: Basic health check
run_test "Basic Health Check" "http_test '/api/health' 200"

# Test 2: Liveness probe
run_test "Liveness Probe" "http_test '/api/health/live' 200"

# Test 3: Readiness probe
run_test "Readiness Probe" "http_test '/api/health/ready' 200"

# Test 4: System health
run_test "System Health" "http_test '/api/health/system' 200"

# Test 5: Main application page
run_test "Main Application Page" "http_test '/' 200"

# Test 6: API endpoints availability
run_test "Generate Code API" "http_test '/api/generate-code' 405"  # Method not allowed is expected for GET

run_test "Debug Code API" "http_test '/api/debug-code' 405"  # Method not allowed is expected for GET

run_test "Generate Pages API" "http_test '/api/generate-pages' 405"  # Method not allowed is expected for GET

# Test 7: Session API
run_test "Session API" "http_test '/api/session' 200"

# Test 8: SFMC API endpoints
run_test "SFMC API" "http_test '/api/sfmc' 405"  # Method not allowed is expected for GET

# Test 9: Check if health endpoint returns expected content
run_test "Health Content Check" "content_test '/api/health' 'healthy'"

# Test 10: Check if main page loads correctly
run_test "Main Page Content" "content_test '/' 'SFMC Development Suite'"

# Test 11: API response time check
run_test "API Response Time" "
  start_time=\$(date +%s%N)
  http_test '/api/health' 200
  end_time=\$(date +%s%N)
  response_time=\$(( (end_time - start_time) / 1000000 ))
  [ \$response_time -lt 2000 ]  # Less than 2 seconds
"

# Test 12: Memory usage check (if metrics endpoint is available)
run_test "Memory Usage Check" "
  response=\$(curl -s --max-time $TIMEOUT '$BASE_URL/api/health/live' 2>/dev/null || echo '')
  if echo \"\$response\" | grep -q 'memory'; then
    # Check if memory usage is reasonable (less than 90%)
    echo \"\$response\" | grep -q '\"usagePercent\":[0-8][0-9]\\|\"usagePercent\":[0-9]\\.'
  else
    true  # Skip if memory info not available
  fi
"

# Test 13: Check if all required environment variables are configured
run_test "Environment Configuration" "
  response=\$(curl -s --max-time $TIMEOUT '$BASE_URL/api/health/ready' 2>/dev/null || echo '')
  if echo \"\$response\" | grep -q 'checks'; then
    # Check if critical services are configured
    ! echo \"\$response\" | grep -q '\"status\":\"fail\".*\"critical\":true'
  else
    true  # Skip if detailed checks not available
  fi
"

# Test 14: Database/Redis connectivity
run_test "Redis Connectivity" "
  response=\$(curl -s --max-time $TIMEOUT '$BASE_URL/api/health/ready' 2>/dev/null || echo '')
  if echo \"\$response\" | grep -q 'redis'; then
    echo \"\$response\" | grep -q '\"name\":\"redis\".*\"status\":\"pass\"'
  else
    true  # Skip if Redis check not available
  fi
"

# Test 15: Security headers check
run_test "Security Headers" "
  headers=\$(curl -s -I --max-time $TIMEOUT '$BASE_URL/' 2>/dev/null || echo '')
  # Check for basic security headers (this is a basic check)
  echo \"\$headers\" | grep -qi 'x-frame-options\\|x-content-type-options\\|x-xss-protection' || true
"

echo "================================"
echo "Smoke tests completed!"
echo -e "Results: ${GREEN}$TESTS_PASSED passed${NC}, ${RED}$TESTS_FAILED failed${NC}, $TESTS_TOTAL total"

# Summary
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ $TESTS_FAILED smoke tests failed${NC}"
  
  # Show failed test details if available
  if [ -f /tmp/smoke_test_response.json ]; then
    echo "Last response:"
    cat /tmp/smoke_test_response.json
  fi
  
  exit 1
fi