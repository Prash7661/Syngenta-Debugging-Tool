import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'SFMC Integration API',
    version: '1.0.0',
    endpoints: {
      authentication: {
        POST: '/api/sfmc/authenticate - Authenticate with SFMC OAuth',
        PUT: '/api/sfmc/authenticate - Refresh access token'
      },
      dataExtensions: {
        GET: '/api/sfmc/data-extensions - List data extensions',
        POST: '/api/sfmc/data-extensions - Create data extension',
        PUT: '/api/sfmc/data-extensions - Update data extension',
        DELETE: '/api/sfmc/data-extensions - Delete data extension'
      },
      deployment: {
        POST: '/api/sfmc/deploy - Deploy cloud page or code resource',
        GET: '/api/sfmc/deploy - Get deployment status',
        PUT: '/api/sfmc/deploy - Batch deployment',
        DELETE: '/api/sfmc/deploy - Rollback deployment'
      }
    },
    supportedFeatures: [
      'OAuth 2.0 Authentication',
      'Data Extension Management',
      'Cloud Page Deployment',
      'Code Resource Deployment',
      'Batch Operations',
      'Deployment Rollback',
      'Real-time Status Monitoring'
    ],
    rateLimits: {
      authentication: '10 requests per minute',
      dataExtensions: '100 requests per minute',
      deployment: '20 requests per minute'
    }
  });
}