import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SFMCIntegrationService } from '@/services/sfmc/sfmc-integration.service';
import { ServiceFactory } from '@/services/factory/service-factory';
import { handleApiError } from '@/utils/errors/error-handler';
import { validateRequest } from '@/utils/validation/validators';
import { Validators } from '@/utils/validation/validators';

// Input validation schema
const authenticateSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required').refine(
    (val) => Validators.isValidSFMCClientId(val),
    'Invalid SFMC Client ID format'
  ),
  clientSecret: z.string().min(1, 'Client Secret is required').min(20, 'Client Secret too short'),
  subdomain: z.string().min(1, 'Subdomain is required').refine(
    (val) => Validators.isValidSFMCSubdomain(val),
    'Invalid SFMC subdomain format'
  ),
  grantType: z.enum(['client_credentials', 'authorization_code']).default('client_credentials'),
  scope: z.array(z.string()).default(['email_read', 'email_write', 'email_send']),
  authorizationCode: z.string().optional() // Required for authorization_code grant type
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validatedData = validateRequest(authenticateSchema, body);

    // Additional validation for authorization_code grant type
    if (validatedData.grantType === 'authorization_code' && !validatedData.authorizationCode) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Authorization code is required for authorization_code grant type',
          code: 'MISSING_AUTH_CODE'
        }
      }, { status: 400 });
    }

    // Get SFMC service instance
    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    // Authenticate with SFMC
    const result = await sfmcService.authenticate({
      clientId: validatedData.clientId,
      clientSecret: validatedData.clientSecret,
      subdomain: validatedData.subdomain,
      grantType: validatedData.grantType,
      scope: validatedData.scope,
      authorizationCode: validatedData.authorizationCode
    });

    // Return success response (without exposing sensitive data)
    return NextResponse.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
        scope: result.scope,
        connectionId: result.connectionId,
        subdomain: validatedData.subdomain
      }
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'SFMC authentication failed');
  }
}

// Refresh token endpoint
export async function PUT(request: NextRequest) {
  try {
    const refreshTokenSchema = z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
      connectionId: z.string().min(1, 'Connection ID is required')
    });

    const body = await request.json();
    const validatedData = validateRequest(refreshTokenSchema, body);

    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    const result = await sfmcService.refreshToken(
      validatedData.refreshToken,
      validatedData.connectionId
    );

    return NextResponse.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
        scope: result.scope
      }
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Token refresh failed');
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'SFMC Authentication API',
    supportedGrantTypes: ['client_credentials', 'authorization_code'],
    defaultScopes: ['email_read', 'email_write', 'email_send'],
    endpoints: {
      POST: '/api/sfmc/authenticate - Authenticate with SFMC',
      PUT: '/api/sfmc/authenticate - Refresh access token'
    }
  });
}