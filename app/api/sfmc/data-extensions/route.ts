import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SFMCIntegrationService } from '@/services/sfmc/sfmc-integration.service';
import { ServiceFactory } from '@/services/factory/service-factory';
import { handleApiError } from '@/utils/errors/error-handler';
import { validateRequest } from '@/utils/validation/validators';

// Query parameters validation schema
const dataExtensionsQuerySchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  filter: z.string().optional(),
  sortBy: z.enum(['name', 'createdDate', 'modifiedDate']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeFields: z.boolean().default(false),
  includeData: z.boolean().default(false),
  dataExtensionKey: z.string().optional() // For specific DE lookup
});

// Create/Update data extension schema
const dataExtensionSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  dataExtension: z.object({
    name: z.string().min(1, 'Data Extension name is required').max(100),
    customerKey: z.string().min(1, 'Customer Key is required').max(36),
    description: z.string().max(500).optional(),
    isSendable: z.boolean().default(false),
    isTestable: z.boolean().default(false),
    sendableDataExtensionField: z.object({
      name: z.string(),
      fieldType: z.enum(['Text', 'Number', 'Date', 'Boolean', 'EmailAddress', 'Phone', 'Decimal'])
    }).optional(),
    fields: z.array(z.object({
      name: z.string().min(1, 'Field name is required').max(50),
      fieldType: z.enum(['Text', 'Number', 'Date', 'Boolean', 'EmailAddress', 'Phone', 'Decimal']),
      maxLength: z.number().min(1).max(4000).optional(),
      defaultValue: z.string().optional(),
      isRequired: z.boolean().default(false),
      isPrimaryKey: z.boolean().default(false),
      isNullable: z.boolean().default(true)
    })).min(1, 'At least one field is required')
  })
});

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = validateRequest(dataExtensionsQuerySchema, queryParams);

    // Get SFMC service instance
    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    // Get data extensions
    const result = await sfmcService.getDataExtensions({
      connectionId: validatedQuery.connectionId,
      page: validatedQuery.page,
      pageSize: validatedQuery.pageSize,
      filter: validatedQuery.filter,
      sortBy: validatedQuery.sortBy,
      sortOrder: validatedQuery.sortOrder,
      includeFields: validatedQuery.includeFields,
      includeData: validatedQuery.includeData,
      dataExtensionKey: validatedQuery.dataExtensionKey
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to retrieve data extensions');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validatedData = validateRequest(dataExtensionSchema, body);

    // Get SFMC service instance
    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    // Create data extension
    const result = await sfmcService.createDataExtension({
      connectionId: validatedData.connectionId,
      dataExtension: validatedData.dataExtension
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'Failed to create data extension');
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validatedData = validateRequest(dataExtensionSchema, body);

    // Get SFMC service instance
    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    // Update data extension
    const result = await sfmcService.updateDataExtension({
      connectionId: validatedData.connectionId,
      dataExtension: validatedData.dataExtension
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to update data extension');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const deleteSchema = z.object({
      connectionId: z.string().min(1, 'Connection ID is required'),
      dataExtensionKey: z.string().min(1, 'Data Extension Key is required')
    });

    const body = await request.json();
    const validatedData = validateRequest(deleteSchema, body);

    const sfmcService = ServiceFactory.getService<SFMCIntegrationService>('sfmc');

    const result = await sfmcService.deleteDataExtension({
      connectionId: validatedData.connectionId,
      dataExtensionKey: validatedData.dataExtensionKey
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Failed to delete data extension');
  }
}