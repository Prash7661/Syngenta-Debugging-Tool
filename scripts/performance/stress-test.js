import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Stress test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '30s', target: 25 },  // Ramp up to 25 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users (stress level)
    { duration: '30s', target: 25 },  // Ramp down to 25 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests must complete below 5s (relaxed for stress test)
    http_req_failed: ['rate<0.10'],    // Error rate must be below 10% (relaxed for stress test)
    errors: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // Simulate heavy load scenarios
  const scenarios = [
    heavyHealthChecks,
    concurrentAPIRequests,
    sessionStressTest,
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
  
  // Shorter sleep for stress test
  sleep(0.5);
}

function heavyHealthChecks() {
  // Multiple health check requests in quick succession
  const endpoints = [
    '/api/health',
    '/api/health/live',
    '/api/health/ready',
    '/api/health/system',
  ];
  
  endpoints.forEach(endpoint => {
    const response = http.get(`${BASE_URL}${endpoint}`);
    
    const success = check(response, {
      [`${endpoint} status is 200`]: (r) => r.status === 200,
      [`${endpoint} response time < 3000ms`]: (r) => r.timings.duration < 3000,
    });
    
    errorRate.add(!success);
    responseTime.add(response.timings.duration);
  });
}

function concurrentAPIRequests() {
  // Simulate concurrent API requests
  const requests = [
    ['GET', `${BASE_URL}/api/session`],
    ['GET', `${BASE_URL}/api/session/preferences`],
    ['GET', `${BASE_URL}/api/health`],
    ['GET', `${BASE_URL}/`],
  ];
  
  const responses = http.batch(requests);
  
  responses.forEach((response, index) => {
    const success = check(response, {
      [`batch request ${index} status is 200 or 405`]: (r) => r.status === 200 || r.status === 405,
      [`batch request ${index} response time < 5000ms`]: (r) => r.timings.duration < 5000,
    });
    
    errorRate.add(!success);
    responseTime.add(response.timings.duration);
  });
}

function sessionStressTest() {
  // Stress test session management
  let response = http.get(`${BASE_URL}/api/session`);
  
  let success = check(response, {
    'session creation status is 200': (r) => r.status === 200,
    'session creation response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  
  // Test session preferences under load
  response = http.get(`${BASE_URL}/api/session/preferences`);
  
  success = check(response, {
    'session preferences status is 200': (r) => r.status === 200,
    'session preferences response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  
  // Test conversation endpoint
  response = http.get(`${BASE_URL}/api/session/conversation`);
  
  success = check(response, {
    'conversation endpoint status is 200': (r) => r.status === 200,
    'conversation endpoint response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

export function handleSummary(data) {
  const results = {
    test_type: 'stress_test',
    avg_response_time: data.metrics.http_req_duration.values.avg,
    p95_response_time: data.metrics.http_req_duration.values['p(95)'],
    p99_response_time: data.metrics.http_req_duration.values['p(99)'],
    requests_per_sec: data.metrics.http_reqs.values.rate,
    error_rate: data.metrics.http_req_failed.values.rate * 100,
    total_requests: data.metrics.http_reqs.values.count,
    total_errors: data.metrics.http_req_failed.values.count,
    max_vus: 50,
  };
  
  return {
    'stress-test-results.json': JSON.stringify(results, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}