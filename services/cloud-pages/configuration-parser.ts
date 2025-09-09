/**
 * Configuration Parser and Validator
 * Handles JSON/YAML configuration parsing and validation for cloud pages
 */

import { z } from 'zod';
// Simple YAML parser for basic configurations
class SimpleYAMLParser {
  static parse(yamlString: string): any {
    // This is a very basic YAML parser for simple key-value structures
    // In production, you would use a proper YAML library like js-yaml
    const lines = yamlString.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    const result: any = {};
    let currentObject = result;
    const stack: any[] = [result];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const indent = line.length - line.trimStart().length;
      const colonIndex = trimmed.indexOf(':');
      
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        if (value) {
          // Simple value
          currentObject[key] = this.parseValue(value);
        } else {
          // Object start
          currentObject[key] = {};
          currentObject = currentObject[key];
        }
      }
    }
    
    return result;
  }
  
  private static parseValue(value: string): any {
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Number
    if (!isNaN(Number(value))) return Number(value);
    
    // Array (simple)
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1).split(',').map(v => this.parseValue(v.trim()));
    }
    
    return value;
  }
}
import { 
  PageConfiguration, 
  ValidationResult, 
  ValidationWarning,
  PageType,
  Framework,
  ComponentType
} from '../../types/cloud-pages';

// Zod schemas for validation
const PageTypeSchema = z.enum(['landing', 'form', 'preference', 'unsubscribe', 'custom']);
const FrameworkSchema = z.enum(['bootstrap', 'tailwind', 'vanilla']);
const ComponentTypeSchema = z.enum(['header', 'footer', 'form', 'content', 'navigation', 'hero', 'cta']);

const PageSettingsSchema = z.object({
  pageName: z.string().min(1, 'Page name is required').max(100, 'Page name too long'),
  publishedURL: z.string().min(1, 'Published URL is required'),
  pageType: PageTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  keywords: z.array(z.string()).optional()
});

const ResourceConfigurationSchema = z.object({
  css: z.object({
    framework: FrameworkSchema,
    customCSS: z.string().optional(),
    externalStylesheets: z.array(z.string().url()).optional()
  }),
  javascript: z.object({
    customJS: z.string().optional(),
    externalScripts: z.array(z.string().url()).optional(),
    ampscriptIntegration: z.boolean().optional()
  })
});

const AdvancedOptionsSchema = z.object({
  responsive: z.boolean().default(true),
  mobileFirst: z.boolean().default(true),
  accessibility: z.boolean().default(true),
  seoOptimized: z.boolean().default(true),
  ampscriptEnabled: z.boolean().default(false),
  dataExtensionIntegration: z.array(z.string()).optional()
});

const LayoutConfigurationSchema = z.object({
  structure: z.enum(['single-column', 'two-column', 'three-column', 'grid', 'custom']),
  header: z.boolean().default(true),
  footer: z.boolean().default(true),
  sidebar: z.enum(['left', 'right', 'both']).optional(),
  containerWidth: z.enum(['fluid', 'fixed', 'responsive']).default('responsive')
});

const ComponentConfigurationSchema = z.object({
  id: z.string().min(1, 'Component ID is required'),
  type: ComponentTypeSchema,
  position: z.number().min(0, 'Position must be non-negative'),
  props: z.record(z.any()),
  content: z.string().optional(),
  ampscript: z.string().optional(),
  styling: z.object({
    classes: z.array(z.string()).optional(),
    customCSS: z.string().optional(),
    responsive: z.object({
      mobile: z.string().optional(),
      tablet: z.string().optional(),
      desktop: z.string().optional()
    }).optional()
  }).optional()
});

const PageConfigurationSchema = z.object({
  pageSettings: PageSettingsSchema,
  codeResources: ResourceConfigurationSchema,
  advancedOptions: AdvancedOptionsSchema,
  layout: LayoutConfigurationSchema,
  components: z.array(ComponentConfigurationSchema)
});

export class ConfigurationParser {
  /**
   * Parse JSON configuration string
   */
  parseJSON(configString: string): PageConfiguration {
    try {
      const config = JSON.parse(configString);
      return this.validateConfiguration(config);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse YAML configuration string
   */
  parseYAML(configString: string): PageConfiguration {
    try {
      const config = SimpleYAMLParser.parse(configString);
      return this.validateConfiguration(config);
    } catch (error) {
      throw new Error(`Invalid YAML format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate configuration object against schema
   */
  validateConfiguration(config: any): PageConfiguration {
    const result = PageConfigurationSchema.safeParse(config);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      throw new ConfigurationValidationError('Configuration validation failed', errors);
    }

    return result.data;
  }

  /**
   * Validate configuration and return detailed results
   */
  validateWithDetails(config: any): ValidationResult {
    const result = PageConfigurationSchema.safeParse(config);
    
    if (result.success) {
      const warnings = this.generateWarnings(result.data);
      return {
        isValid: true,
        errors: [],
        warnings
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return {
      isValid: false,
      errors,
      warnings: []
    };
  }

  /**
   * Generate warnings for potential issues
   */
  private generateWarnings(config: PageConfiguration): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for potential performance issues
    if (config.codeResources.css.externalStylesheets && 
        config.codeResources.css.externalStylesheets.length > 3) {
      warnings.push({
        field: 'codeResources.css.externalStylesheets',
        message: 'Too many external stylesheets may impact performance',
        suggestion: 'Consider consolidating stylesheets or using a CSS bundler'
      });
    }

    if (config.codeResources.javascript.externalScripts && 
        config.codeResources.javascript.externalScripts.length > 5) {
      warnings.push({
        field: 'codeResources.javascript.externalScripts',
        message: 'Too many external scripts may impact performance',
        suggestion: 'Consider consolidating scripts or using async loading'
      });
    }

    // Check for accessibility concerns
    if (!config.advancedOptions.accessibility) {
      warnings.push({
        field: 'advancedOptions.accessibility',
        message: 'Accessibility is disabled',
        suggestion: 'Enable accessibility features for better user experience'
      });
    }

    // Check for SEO optimization
    if (!config.advancedOptions.seoOptimized) {
      warnings.push({
        field: 'advancedOptions.seoOptimized',
        message: 'SEO optimization is disabled',
        suggestion: 'Enable SEO optimization for better search visibility'
      });
    }

    // Check component positioning
    const positions = config.components.map(c => c.position);
    const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
    
    if (duplicatePositions.length > 0) {
      warnings.push({
        field: 'components',
        message: 'Duplicate component positions detected',
        suggestion: 'Ensure each component has a unique position value'
      });
    }

    return warnings;
  }

  /**
   * Generate default configuration
   */
  generateDefaultConfiguration(): PageConfiguration {
    return {
      pageSettings: {
        pageName: 'New Cloud Page',
        publishedURL: '',
        pageType: 'landing',
        title: 'Welcome to Our Page',
        description: 'A new SFMC cloud page',
        keywords: []
      },
      codeResources: {
        css: {
          framework: 'bootstrap',
          customCSS: '',
          externalStylesheets: []
        },
        javascript: {
          customJS: '',
          externalScripts: [],
          ampscriptIntegration: false
        }
      },
      advancedOptions: {
        responsive: true,
        mobileFirst: true,
        accessibility: true,
        seoOptimized: true,
        ampscriptEnabled: false,
        dataExtensionIntegration: []
      },
      layout: {
        structure: 'single-column',
        header: true,
        footer: true,
        containerWidth: 'responsive'
      },
      components: []
    };
  }
}

export class ConfigurationValidationError extends Error {
  constructor(message: string, public errors: any[]) {
    super(message);
    this.name = 'ConfigurationValidationError';
  }
}

export const configurationParser = new ConfigurationParser();