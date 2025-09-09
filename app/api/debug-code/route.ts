import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CodeAnalysisService } from '@/services/debugging/code-analysis.service';
import { ServiceFactory } from '@/services/factory/service-factory';
import { handleApiError } from '@/utils/errors/error-handler';
import { validateRequest } from '@/utils/validation/validators';
import { DebugLanguage, DebugMessage } from '@/types/debugging';

// Input validation schema
const debugCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50000, 'Code too large'),
  language: z.enum(['sql', 'ampscript', 'ssjs', 'css', 'html', 'javascript']),
  analysisLevel: z.enum(['syntax', 'performance', 'security', 'all']).default('all'),
  conversationHistory: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.number(),
    metadata: z.object({
      language: z.enum(['sql', 'ampscript', 'ssjs', 'css', 'html', 'javascript']).optional(),
      analysisType: z.string().optional(),
      errors: z.array(z.object({
        line: z.number(),
        column: z.number(),
        severity: z.enum(['error', 'warning', 'info']),
        message: z.string(),
        rule: z.string(),
        fixSuggestion: z.string().optional()
      })).optional()
    }).optional()
  })).default([]),
  options: z.object({
    includeFixSuggestions: z.boolean().default(true),
    includePerformanceMetrics: z.boolean().default(true),
    includeBestPractices: z.boolean().default(true),
    maxSuggestions: z.number().min(1).max(20).default(10)
  }).default({})
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validatedData = validateRequest(debugCodeSchema, body);

    // Get debugging service instance
    const debugService = ServiceFactory.getService<CodeAnalysisService>('debugging');

    // Perform code analysis
    const result = await debugService.analyzeCode({
      code: validatedData.code,
      language: validatedData.language as DebugLanguage,
      analysisLevel: validatedData.analysisLevel,
      conversationHistory: validatedData.conversationHistory as DebugMessage[],
      options: validatedData.options
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Code debugging failed');
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Code Debugging API',
    supportedLanguages: ['sql', 'ampscript', 'ssjs', 'css', 'html', 'javascript'],
    analysisLevels: ['syntax', 'performance', 'security', 'all'],
    endpoints: {
      POST: '/api/debug-code - Analyze and debug code'
    }
  });
}