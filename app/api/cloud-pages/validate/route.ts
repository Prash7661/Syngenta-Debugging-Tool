/**
 * Cloud Pages Configuration Validation API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { cloudPagesService } from '../../../../services/cloud-pages';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration is required' },
        { status: 400 }
      );
    }

    const validationResult = cloudPagesService.validateConfiguration(config);

    return NextResponse.json({
      success: true,
      data: validationResult
    });

  } catch (error) {
    console.error('Configuration validation failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}