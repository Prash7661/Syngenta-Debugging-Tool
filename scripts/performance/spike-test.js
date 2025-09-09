import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Spike test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Normal load
    { duration: '10s', target: 100 }, // Spike to 100 users
    { duration: '30s', target: 100 }, // Stay at spike level
    { duration: '10s', target: 5 },   // Drop back to normal
    { duration: '30s', target: 5 },   // Recover
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests must complete below 10s (very relaxed for spike test)
    http_req_failed: ['rate<0.20'],     // Error rate must be below 20% (relaxed for spike test)
    errors: ['rate<0.20'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // Focus on critical endpoints during spike
  const criticalEndpoints = [
    testCriticalHealth,
    testMainPageSpike,
    testSessionSpike,
  ];
  
  const test = criticalEndpoints[Math.floor(Math.random() * criticalEndpoints.length)];
  test();
  
  // Very short sleep during spike test
  sleep(0.1);
}

function testCriticalHealth() {
  const response = http.get(`${BASE_URL}/api/health`);
  
  const success = check(response, {
    'health endpoint available during spike': (r) => r.status === 200,
    'health endpoint responds within 10s': (r) => r.timings.duration < 10000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testMainPageSpike() {
  const response = http.get(`${BASE_URL}/`);
  
  const success = check(response, {
    'main page available during spike': (r) => r.status === 200,
    'main page responds within 15s': (r) => r.timings.duration < 15000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testSessionSpike() {
  const response = http.get(`${BASE_URL}/api/session`);
  
  const success = check(response, {
    'session endpoint available during spike': (r) => r.status === 200,
    'session endpoint responds within 10s': (r) => r.timings.duration < 10000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

export function handleSummary(data) {
  const results = {
    test_type: 'spike_test',
    avg_response_time: data.metrics.http_req_duration.values.avg,
    p95_response_time: data.metrics.http_req_duration.values['p(95)'],
    p99_response_time: data.metrics.http_req_duration.values['p(99)'],
    max_response_time: data.metrics.http_req_duration.values.max,
    requests_per_sec: data.metrics.http_reqs.values.rate,
    error_rate: data.metrics.http_req_failed.values.rate * 100,
    total_requests: data.metrics.http_reqs.values.count,
    total_errors: data.metrics.http_req_failed.values.count,
    spike_vus: 100,
  };
  
  return {
    'spike-test-results.json': JSON.stringify(results, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}