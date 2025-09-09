/**
 * Cloud Pages Generator Types
 * Defines interfaces and types for SFMC cloud page generation
 */

export type PageType = 'landing' | 'form' | 'preference' | 'unsubscribe' | 'custom';
export type Framework = 'bootstrap' | 'tailwind' | 'vanilla';
export type ComponentType = 'header' | 'footer' | 'form' | 'content' | 'navigation' | 'hero' | 'cta';

export interface PageConfiguration {
  pageSettings: {
    pageName: string;
    publishedURL: string;
    pageType: PageType;
    title: string;
    description?: string;
    keywords?: string[];
  };
  codeResources: ResourceConfiguration;
  advancedOptions: AdvancedOptions;
  layout: LayoutConfiguration;
  components: ComponentConfiguration[];
}

export interface ResourceConfiguration {
  css: {
    framework: Framework;
    customCSS?: string;
    externalStylesheets?: string[];
  };
  javascript: {
    customJS?: string;
    externalScripts?: string[];
    ampscriptIntegration?: boolean;
  };
}

export interface AdvancedOptions {
  responsive: boolean;
  mobileFirst: boolean;
  accessibility: boolean;
  seoOptimized: boolean;
  ampscriptEnabled: boolean;
  dataExtensionIntegration?: string[];
}

export interface LayoutConfiguration {
  structure: 'single-column' | 'two-column' | 'three-column' | 'grid' | 'custom';
  header: boolean;
  footer: boolean;
  sidebar?: 'left' | 'right' | 'both';
  containerWidth?: 'fluid' | 'fixed' | 'responsive';
}

export interface ComponentConfiguration {
  id: string;
  type: ComponentType;
  position: number;
  props: Record<string, any>;
  content?: string;
  ampscript?: string;
  styling?: ComponentStyling;
}

export interface ComponentStyling {
  classes?: string[];
  customCSS?: string;
  responsive?: ResponsiveBreakpoints;
}

export interface ResponsiveBreakpoints {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  pageType: PageType;
  framework: Framework;
  configuration: PageConfiguration;
  preview?: string;
  tags?: string[];
}

export interface GeneratedPage {
  html: string;
  css: string;
  javascript?: string;
  ampscript?: string;
  metadata: PageMetadata;
}

export interface PageMetadata {
  pageName: string;
  generatedAt: Date;
  framework: Framework;
  components: string[];
  fileSize: number;
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  estimatedLoadTime: number;
  cssSize: number;
  jsSize: number;
  htmlSize: number;
  optimizationScore: number;
}

export interface CodeResource {
  type: 'css' | 'javascript' | 'ampscript';
  name: string;
  content: string;
  description?: string;
}

export interface GeneratedOutput {
  pages: GeneratedPage[];
  codeResources: CodeResource[];
  integrationNotes: string;
  testingGuidelines: string;
  deploymentInstructions: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface UIComponent {
  id: string;
  name: string;
  category: string;
  description: string;
  props: ComponentProp[];
  template: string;
  styles: ComponentStyles;
  ampscriptSupport: boolean;
}

export interface ComponentProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description?: string;
  validation?: PropValidation;
}

export interface PropValidation {
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
}

export interface ComponentStyles {
  bootstrap?: string;
  tailwind?: string;
  vanilla?: string;
}