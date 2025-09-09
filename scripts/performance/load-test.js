import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up to 5 users
    { duration: '3m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // Test scenarios
  const scenarios = [
    testHealthEndpoint,
    testMainPage,
    testAPIEndpoints,
    testSessionManagement,
  ];
  
  // Randomly select a scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
  
  sleep(1);
}

function testHealthEndpoint() {
  const response = http.get(`${BASE_URL}/api/health`);
  
  const success = check(response, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health endpoint response time < 500ms': (r) => r.timings.duration < 500,
    'health endpoint returns healthy status': (r) => r.json('status') === 'healthy',
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testMainPage() {
  const response = http.get(`${BASE_URL}/`);
  
  const success = check(response, {
    'main page status is 200': (r) => r.status === 200,
    'main page response time < 2000ms': (r) => r.timings.duration < 2000,
    'main page contains title': (r) => r.body.includes('SFMC Development Suite'),
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testAPIEndpoints() {
  // Test session endpoint
  let response = http.get(`${BASE_URL}/api/session`);
  
  let success = check(response, {
    'session API status is 200': (r) => r.status === 200,
    'session API response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  
  // Test health system endpoint
  response = http.get(`${BASE_URL}/api/health/system`);
  
  success = check(response, {
    'system health status is 200': (r) => r.status === 200,
    'system health response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testSessionManagement() {
  // Test session preferences
  const response = http.get(`${BASE_URL}/api/session/preferences`);
  
  const success = check(response, {
    'session preferences status is 200': (r) => r.status === 200,
    'session preferences response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

export function handleSummary(data) {
  const results = {
    avg_response_time: data.metrics.http_req_duration.values.avg,
    p95_response_time: data.metrics.http_req_duration.values['p(95)'],
    requests_per_sec: data.metrics.http_reqs.values.rate,
    error_rate: data.metrics.http_req_failed.values.rate * 100,
    total_requests: data.metrics.http_reqs.values.count,
    total_errors: data.metrics.http_req_failed.values.count,
  };
  
  return {
    'performance-results.json': JSON.stringify(results, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}