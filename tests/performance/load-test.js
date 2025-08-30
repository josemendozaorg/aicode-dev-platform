import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    // Ramp-up
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    // Stay at peak
    { duration: '10m', target: 100 },
    // Ramp-down
    { duration: '2m', target: 50 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    errors: ['rate<0.05'],             // Custom error rate under 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUser = {
  email: `test-${Math.random().toString(36).substring(7)}@example.com`,
  password: 'TestPassword123!',
  name: 'Load Test User'
};

let authToken = '';

export default function () {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    
    check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check has correct body': (r) => r.json().status === 'OK',
    }) || errorRate.add(1);
    
    responseTime.add(response.timings.duration);
    sleep(1);
  });

  group('User Registration', () => {
    const payload = JSON.stringify({
      email: testUser.email,
      password: testUser.password,
      name: testUser.name,
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = http.post(`${BASE_URL}/api/auth/register`, payload, params);
    
    check(response, {
      'registration status is 201': (r) => r.status === 201,
      'registration returns user data': (r) => r.json().data.user !== undefined,
      'registration returns tokens': (r) => r.json().data.tokens !== undefined,
    }) || errorRate.add(1);

    if (response.status === 201) {
      authToken = response.json().data.tokens.accessToken;
    }
    
    responseTime.add(response.timings.duration);
    sleep(1);
  });

  group('User Login', () => {
    const payload = JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = http.post(`${BASE_URL}/api/auth/login`, payload, params);
    
    check(response, {
      'login status is 200': (r) => r.status === 200,
      'login returns tokens': (r) => r.json().data.tokens !== undefined,
      'login response time < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    if (response.status === 200) {
      authToken = response.json().data.tokens.accessToken;
    }
    
    responseTime.add(response.timings.duration);
    sleep(1);
  });

  group('Protected Route Access', () => {
    const params = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    };

    const response = http.get(`${BASE_URL}/api/users/profile`, params);
    
    check(response, {
      'profile access status is 200': (r) => r.status === 200,
      'profile contains user data': (r) => r.json().data.user !== undefined,
      'profile response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
    
    responseTime.add(response.timings.duration);
    sleep(1);
  });

  group('API Rate Limiting', () => {
    const params = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    };

    // Make multiple rapid requests to test rate limiting
    for (let i = 0; i < 5; i++) {
      const response = http.get(`${BASE_URL}/api/users/profile`, params);
      
      check(response, {
        'rate limit response is valid': (r) => r.status === 200 || r.status === 429,
        'rate limit headers present': (r) => r.headers['X-RateLimit-Remaining'] !== undefined,
      }) || errorRate.add(1);
      
      responseTime.add(response.timings.duration);
    }
    
    sleep(2);
  });

  group('Error Handling', () => {
    // Test invalid endpoint
    const invalidResponse = http.get(`${BASE_URL}/api/invalid-endpoint`);
    
    check(invalidResponse, {
      'invalid endpoint returns 404': (r) => r.status === 404,
      'error response has proper format': (r) => {
        const body = r.json();
        return body.success === false && body.error !== undefined;
      },
    }) || errorRate.add(1);

    // Test unauthorized access
    const unauthorizedResponse = http.get(`${BASE_URL}/api/users/profile`);
    
    check(unauthorizedResponse, {
      'unauthorized access returns 401': (r) => r.status === 401,
      'unauthorized response has proper format': (r) => {
        const body = r.json();
        return body.success === false && body.error !== undefined;
      },
    }) || errorRate.add(1);
    
    responseTime.add(invalidResponse.timings.duration);
    responseTime.add(unauthorizedResponse.timings.duration);
    sleep(1);
  });
}

export function handleSummary(data) {
  return {
    'performance-test-results.json': JSON.stringify(data, null, 2),
    'performance-test-results.html': htmlReport(data),
  };
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #e9e9e9; border-radius: 5px; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>K6 Performance Test Results</h1>
        <p>Test completed: ${new Date().toISOString()}</p>
        <p>Total VUs: ${data.metrics.vus_max.values.max}</p>
        <p>Test Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s</p>
    </div>

    <h2>Key Metrics</h2>
    <div class="metric ${data.metrics.http_req_failed.values.rate < 0.05 ? 'passed' : 'failed'}">
        <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
    </div>
    <div class="metric ${data.metrics.http_req_duration.values.p95 < 2000 ? 'passed' : 'failed'}">
        <strong>95th Percentile Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values.p95)}ms
    </div>
    <div class="metric">
        <strong>Average Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values.avg)}ms
    </div>
    <div class="metric">
        <strong>Requests Per Second:</strong> ${Math.round(data.metrics.http_reqs.values.rate)}
    </div>

    <h2>Detailed Metrics</h2>
    <table>
        <tr><th>Metric</th><th>Average</th><th>Min</th><th>Max</th><th>95th Percentile</th></tr>
        <tr>
            <td>HTTP Request Duration</td>
            <td>${Math.round(data.metrics.http_req_duration.values.avg)}ms</td>
            <td>${Math.round(data.metrics.http_req_duration.values.min)}ms</td>
            <td>${Math.round(data.metrics.http_req_duration.values.max)}ms</td>
            <td>${Math.round(data.metrics.http_req_duration.values.p95)}ms</td>
        </tr>
        <tr>
            <td>HTTP Requests</td>
            <td colspan="4">${data.metrics.http_reqs.values.count} total (${Math.round(data.metrics.http_reqs.values.rate)}/s)</td>
        </tr>
        <tr>
            <td>Failed Requests</td>
            <td colspan="4">${Math.round(data.metrics.http_req_failed.values.rate * 100 * 100) / 100}%</td>
        </tr>
    </table>

    <h2>Threshold Results</h2>
    <table>
        <tr><th>Threshold</th><th>Result</th></tr>
        ${Object.entries(data.thresholds || {}).map(([name, result]) => 
          `<tr><td>${name}</td><td class="${result.ok ? 'passed' : 'failed'}">${result.ok ? 'PASSED' : 'FAILED'}</td></tr>`
        ).join('')}
    </table>
</body>
</html>
  `;
}