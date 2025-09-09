import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AICodeGenerationService } from '@/services/ai/ai-code-generation.service';
import { ServiceFactory } from '@/services/factory/service-factory';
import { handleApiError } from '@/utils/errors/error-handler';
import { validateRequest } from '@/utils/validation/validators';
import { CodeLanguage, Message } from '@/types/ai';

// Input validation schema
const generateCodeSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000, 'Prompt too long'),
  language: z.enum(['sql', 'ampscript', 'ssjs', 'css', 'html']).optional(),
  image: z.string().optional(),
  conversationHistory: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    image: z.string().optional(),
    timestamp: z.number(),
    metadata: z.object({
      language: z.enum(['sql', 'ampscript', 'ssjs', 'css', 'html']).optional(),
      codeBlocks: z.array(z.object({
        language: z.string(),
        code: z.string(),
        explanation: z.string().optional()
      })).optional()
    }).optional()
  })).default([]),
  context: z.object({
    sfmcInstance: z.string().optional(),
    dataExtensions: z.array(z.string()).optional(),
    businessUnit: z.string().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validatedData = validateRequest(generateCodeSchema, body);

    // Get AI service instance
    const aiService = ServiceFactory.getService<AICodeGenerationService>('ai');

    // Generate code using AI service
    const result = await aiService.generateCode({
      prompt: validatedData.prompt,
      language: validatedData.language as CodeLanguage,
      image: validatedData.image,
      conversationHistory: validatedData.conversationHistory as Message[],
      context: validatedData.context
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    return handleApiError(error, 'Code generation failed');
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Code Generation API',
    supportedLanguages: ['sql', 'ampscript', 'ssjs', 'css', 'html'],
    endpoints: {
      POST: '/api/generate-code - Generate code from prompt'
    }
  });
}