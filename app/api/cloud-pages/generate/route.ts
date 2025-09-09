/**
 * Cloud Pages Generation API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { cloudPagesService } from '../../../../services/cloud-pages';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config, templateId, customizations, framework, ampscriptConfig } = body;

    let result;

    switch (type) {
      case 'json':
        result = await cloudPagesService.generateFromJSON(JSON.stringify(config));
        break;
      case 'yaml':
        result = await cloudPagesService.generateFromYAML(config);
        break;
      case 'config':
        result = await cloudPagesService.generateFromConfig(config);
        break;
      case 'template':
        result = await cloudPagesService.generateFromTemplate(templateId, customizations);
        break;
      case 'mobile-first':
        result = await cloudPagesService.generateMobileFirstPage(config);
        break;
      case 'framework-specific':
        if (!framework) {
          return NextResponse.json(
            { error: 'Framework is required for framework-specific generation' },
            { status: 400 }
          );
        }
        result = await cloudPagesService.generateFrameworkSpecificPage(config, framework);
        break;
      case 'ampscript':
        result = await cloudPagesService.generatePageWithAMPScript(config, ampscriptConfig);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid generation type. Use: json, yaml, config, template, mobile-first, framework-specific, or ampscript' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Cloud pages generation failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const framework = searchParams.get('framework');

    if (action === 'validate-responsive') {
      // Validate responsive configuration from request body
      const config = await request.json();
      const validationResult = cloudPagesService.validateResponsiveConfig(config);
      
      return NextResponse.json({
        success: true,
        data: validationResult
      });
    }

    if (action === 'breakpoints' && framework) {
      // Get responsive breakpoints for framework
      const breakpoints = cloudPagesService.getResponsiveBreakpoints(framework as any);
      
      return NextResponse.json({
        success: true,
        data: { breakpoints }
      });
    }

    // Return available templates and components
    const templates = cloudPagesService.getTemplates();
    const components = cloudPagesService.getComponents();
    const defaultConfig = cloudPagesService.getDefaultConfiguration();

    return NextResponse.json({
      success: true,
      data: {
        templates,
        components,
        defaultConfig
      }
    });

  } catch (error) {
    console.error('Failed to get cloud pages data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}