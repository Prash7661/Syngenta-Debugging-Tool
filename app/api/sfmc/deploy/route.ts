import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SFMCIntegrationService } from '@/services/sfmc/sfmc-integration.service';
import { ServiceFactory } from '@/services/factory/service-factory';
import { handleApiError } from '@/utils/errors/error-handler';
import { validateRequest } from '@/utils/validation/validators';

// Cloud page deployment schema
const deployCloudPageSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  cloudPage: z.object({
    name: z.string().min(1, 'Cloud page name is required').max(100),
    customerKey: z.string().min(1, 'Customer Key is required').max(36),
    description: z.string().max(500).optional(),
    content: z.object({
      html: z.string().min(1, 'HTML content is required'),
      css: z.string().optional(),
      javascript: z.string().optional(),
      ampscript: z.string().optional()
    }),
    settings: z.object({
      isActive: z.boolean().default(true),
      publishedURL: z.string().url().optional(),
      category: z.object({
        id: z.number().optional(),
        name: z.string().optional()
      }).optional(),
      tags: z.array(z.string()).default([]),
      seoSettings: z.object({
        title: z.string().max(60).optional(),
        description: z.string().max(160).optional(),
        keywords: z.array(z.string()).default([])
      }).optional()
    }).default({})
  }),
  deploymentOptions: z.object({
    validateBeforeDeploy: z.boolean().default(true),
    createBackup: z.boolean().default(true),
    publishImmediately: z.boolean().default(false),
    testMode: z.boolean().default(false),
    rollbackOnError: z.boolean().default(true)
  }).default({})
});

// Code resource deployment schema
const deployCodeResourceSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  codeResource: z.object({
    name: z.string().min(1, 'Code resource name is required').max(100),
    customerKey: z.string().min(1, 'Customer Key is required').max(36),
    description: z.string().max(500).optional(),
    content: z.string().min(1, 'Code content is required'),
    resourceType: z.enum(['css', 'javascript', 'text', 'html']),
    category: z.object({
      id: z.number().optional(),
      name: z.string().optional()
    }).optional()
  }),
  deploymentOptions: z.object({
    validateBeforeDeploy: z.boolean().default(true),
    createBackup: z.boolean().default(true),
    testMode: z.boolean().default(false)
  }).default({})
});

// Deployment status schema
const deploymentStatusSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  deploymentId: z.string().min(1, 'Deployment ID is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Determine deployment type based on request structure
    const deploymentType = body.cloudPage ? 'cloudPage' : 'codeResource';
    
    let validatedData;
    if (deploymentType === 'cloudPage') {
      validatedData = validateRequest(deployCloudPageSchema, body);
    } else {
      validatedData = validateRequest(deployCodeResourceSchema, body);
    }

    // Get SFMC service instance
    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    let result;
    if (deploymentType === 'cloudPage') {
      result = await sfmcService.deployCloudPage({
        connectionId: validatedData.connectionId,
        cloudPage: validatedData.cloudPage,
        deploymentOptions: validatedData.deploymentOptions
      });
    } else {
      result = await sfmcService.deployCodeResource({
        connectionId: validatedData.connectionId,
        codeResource: validatedData.codeResource,
        deploymentOptions: validatedData.deploymentOptions
      });
    }

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'Deployment failed');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters for deployment status
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = validateRequest(deploymentStatusSchema, queryParams);

    // Get SFMC service instance
    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    // Get deployment status
    const result = await sfmcService.getDeploymentStatus({
      connectionId: validatedQuery.connectionId,
      deploymentId: validatedQuery.deploymentId
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to get deployment status');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rollbackSchema = z.object({
      connectionId: z.string().min(1, 'Connection ID is required'),
      deploymentId: z.string().min(1, 'Deployment ID is required'),
      reason: z.string().max(500).optional()
    });

    const body = await request.json();
    const validatedData = validateRequest(rollbackSchema, body);

    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    const result = await sfmcService.rollbackDeployment({
      connectionId: validatedData.connectionId,
      deploymentId: validatedData.deploymentId,
      reason: validatedData.reason
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Rollback failed');
  }
}

// Batch deployment endpoint
export async function PUT(request: NextRequest) {
  try {
    const batchDeploySchema = z.object({
      connectionId: z.string().min(1, 'Connection ID is required'),
      deployments: z.array(z.union([
        deployCloudPageSchema.omit({ connectionId: true }),
        deployCodeResourceSchema.omit({ connectionId: true })
      ])).min(1, 'At least one deployment is required').max(10, 'Maximum 10 deployments per batch'),
      batchOptions: z.object({
        continueOnError: z.boolean().default(false),
        parallelExecution: z.boolean().default(true),
        maxConcurrency: z.number().min(1).max(5).default(3)
      }).default({})
    });

    const body = await request.json();
    const validatedData = validateRequest(batchDeploySchema, body);

    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    const result = await sfmcService.batchDeploy({
      connectionId: validatedData.connectionId,
      deployments: validatedData.deployments,
      batchOptions: validatedData.batchOptions
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Batch deployment failed');
  }
}