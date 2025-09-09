import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CloudPagesService } from '@/services/cloud-pages/cloud-pages.service';
import { ServiceFactory } from '@/services/factory/service-factory';
import { handleApiError } from '@/utils/errors/error-handler';
import { validateRequest } from '@/utils/validation/validators';
import { PageConfiguration, PageType } from '@/types/cloud-pages';

// Input validation schema
const generatePagesSchema = z.object({
  configuration: z.object({
    pageSettings: z.object({
      pageName: z.string().min(1, 'Page name is required').max(100),
      publishedURL: z.string().url('Invalid URL format').optional(),
      pageType: z.enum(['landing', 'preference', 'profile', 'custom']).default('landing')
    }),
    codeResources: z.object({
      css: z.array(z.object({
        name: z.string(),
        content: z.string().optional(),
        external: z.boolean().default(false),
        url: z.string().url().optional()
      })).default([]),
      javascript: z.array(z.object({
        name: z.string(),
        content: z.string().optional(),
        external: z.boolean().default(false),
        url: z.string().url().optional()
      })).default([]),
      ampscript: z.object({
        variables: z.array(z.object({
          name: z.string(),
          value: z.string(),
          type: z.enum(['string', 'number', 'boolean']).default('string')
        })).default([]),
        functions: z.array(z.string()).default([])
      }).default({})
    }).default({}),
    advancedOptions: z.object({
      responsive: z.boolean().default(true),
      framework: z.enum(['bootstrap', 'tailwind', 'vanilla']).default('bootstrap'),
      theme: z.enum(['light', 'dark', 'auto']).default('light'),
      accessibility: z.boolean().default(true),
      seoOptimized: z.boolean().default(true),
      analytics: z.object({
        googleAnalytics: z.string().optional(),
        customTracking: z.array(z.string()).default([])
      }).default({})
    }).default({})
  }),
  template: z.object({
    name: z.string().optional(),
    customTemplate: z.string().optional(),
    components: z.array(z.object({
      type: z.enum(['header', 'footer', 'form', 'content', 'navigation', 'sidebar']),
      properties: z.record(z.any()).default({})
    })).default([])
  }).optional(),
  options: z.object({
    generateTests: z.boolean().default(false),
    includeDocumentation: z.boolean().default(true),
    optimizeForSFMC: z.boolean().default(true),
    validateOutput: z.boolean().default(true)
  }).default({})
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validatedData = validateRequest(generatePagesSchema, body);

    // Get cloud pages service instance
    const cloudPagesService = ServiceFactory.getService<CloudPagesService>('cloudPages');

    // Generate cloud pages
    const result = await cloudPagesService.generatePages({
      configuration: validatedData.configuration as PageConfiguration,
      template: validatedData.template,
      options: validatedData.options
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Cloud page generation failed');
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cloud Pages Generation API',
    supportedPageTypes: ['landing', 'preference', 'profile', 'custom'],
    supportedFrameworks: ['bootstrap', 'tailwind', 'vanilla'],
    endpoints: {
      POST: '/api/generate-pages - Generate cloud pages from configuration'
    }
  });
}