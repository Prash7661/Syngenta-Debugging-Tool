/**
 * Cloud Pages Service
 * Main service for generating SFMC cloud pages with configuration-based approach
 */

import { 
  PageConfiguration, 
  GeneratedPage, 
  GeneratedOutput, 
  ValidationResult,
  PageTemplate,
  UIComponent,
  Framework
} from '../../types/cloud-pages';
import { ConfigurationParser } from './configuration-parser';
import { TemplateEngine } from './template-engine';
import { UIComponentLibrary } from './ui-component-library';
import { ResponsiveGenerator } from './responsive-generator';
import { AMPScriptIntegration } from './ampscript-integration';
interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

class SimpleLogger implements Logger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  }
  
  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta || '');
  }
}

export class CloudPagesService {
  private logger: Logger;
  private configParser: ConfigurationParser;
  private templateEngine: TemplateEngine;
  private componentLibrary: UIComponentLibrary;
  private responsiveGenerator: ResponsiveGenerator;
  private ampscriptIntegration: AMPScriptIntegration;

  constructor() {
    this.logger = new SimpleLogger();
    this.configParser = new ConfigurationParser();
    this.templateEngine = new TemplateEngine();
    this.componentLibrary = new UIComponentLibrary();
    this.responsiveGenerator = new ResponsiveGenerator();
    this.ampscriptIntegration = new AMPScriptIntegration();
  }

  /**
   * Generate cloud page from JSON configuration
   */
  async generateFromJSON(configString: string): Promise<GeneratedOutput> {
    try {
      const config = this.configParser.parseJSON(configString);
      return await this.generatePage(config);
    } catch (error) {
      this.logger.error('Failed to generate page from JSON', { error });
      throw error;
    }
  }

  /**
   * Generate cloud page from YAML configuration
   */
  async generateFromYAML(configString: string): Promise<GeneratedOutput> {
    try {
      const config = this.configParser.parseYAML(configString);
      return await this.generatePage(config);
    } catch (error) {
      this.logger.error('Failed to generate page from YAML', { error });
      throw error;
    }
  }

  /**
   * Generate cloud page from configuration object
   */
  async generateFromConfig(config: PageConfiguration): Promise<GeneratedOutput> {
    try {
      // Validate configuration
      const validationResult = this.validateConfiguration(config);
      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      return await this.generatePage(config);
    } catch (error) {
      this.logger.error('Failed to generate page from config', { error });
      throw error;
    }
  }

  /**
   * Generate cloud page from template
   */
  async generateFromTemplate(templateId: string, customizations?: Partial<PageConfiguration>): Promise<GeneratedOutput> {
    try {
      const template = this.templateEngine.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Merge template configuration with customizations
      const config = customizations 
        ? this.mergeConfigurations(template.configuration, customizations)
        : template.configuration;

      return await this.generatePage(config);
    } catch (error) {
      this.logger.error('Failed to generate page from template', { templateId, error });
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration(config: PageConfiguration): ValidationResult {
    try {
      return this.configParser.validateWithDetails(config);
    } catch (error) {
      this.logger.error('Configuration validation failed', { error });
      return {
        isValid: false,
        errors: [{ field: 'general', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    }
  }

  /**
   * Get available templates
   */
  getTemplates(): PageTemplate[] {
    return this.templateEngine.getAllTemplates();
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(pageType: string): PageTemplate[] {
    return this.templateEngine.getTemplatesByType(pageType as any);
  }

  /**
   * Get available UI components
   */
  getComponents(): UIComponent[] {
    return this.componentLibrary.getAllComponents();
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: string): UIComponent[] {
    return this.componentLibrary.getComponentsByCategory(category);
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration(): PageConfiguration {
    return this.configParser.generateDefaultConfiguration();
  }

  /**
   * Generate page from configuration
   */
  private async generatePage(config: PageConfiguration): Promise<GeneratedOutput> {
    const startTime = Date.now();

    try {
      // Generate HTML structure
      const html = this.generateHTML(config);
      
      // Generate CSS
      const css = this.generateCSS(config);
      
      // Generate JavaScript
      const javascript = this.generateJavaScript(config);
      
      // Generate AMPScript if enabled
      const ampscript = config.advancedOptions.ampscriptEnabled 
        ? this.generateAMPScript(config) 
        : undefined;

      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(html, css, javascript);

      // Create generated page
      const generatedPage: GeneratedPage = {
        html,
        css,
        javascript,
        ampscript,
        metadata: {
          pageName: config.pageSettings.pageName,
          generatedAt: new Date(),
          framework: config.codeResources.css.framework,
          components: config.components.map(c => c.type),
          fileSize: html.length + css.length + (javascript?.length || 0),
          performance
        }
      };

      // Generate code resources
      const codeResources = this.generateCodeResources(config, css, javascript, ampscript);

      // Generate documentation
      const integrationNotes = this.generateIntegrationNotes(config);
      const testingGuidelines = this.generateTestingGuidelines(config);
      const deploymentInstructions = this.generateDeploymentInstructions(config);

      const executionTime = Date.now() - startTime;
      this.logger.info('Page generated successfully', { 
        pageName: config.pageSettings.pageName,
        executionTime,
        fileSize: generatedPage.metadata.fileSize
      });

      return {
        pages: [generatedPage],
        codeResources,
        integrationNotes,
        testingGuidelines,
        deploymentInstructions
      };

    } catch (error) {
      this.logger.error('Page generation failed', { error });
      throw error;
    }
  }

  /**
   * Generate HTML content
   */
  private generateHTML(config: PageConfiguration): string {
    return this.templateEngine.generateBaseStructure(config);
  }

  /**
   * Generate CSS content
   */
  private generateCSS(config: PageConfiguration): string {
    let css = '';

    // Add framework-specific base styles
    css += this.getFrameworkBaseCSS(config.codeResources.css.framework);

    // Add responsive framework utilities
    css += this.responsiveGenerator.generateFrameworkResponsiveUtils(config.codeResources.css.framework);

    // Add responsive image handling
    css += this.responsiveGenerator.generateResponsiveImageCSS();

    // Add component styles
    config.components.forEach(component => {
      const uiComponent = this.componentLibrary.getComponent(component.type);
      if (uiComponent) {
        const frameworkStyles = uiComponent.styles[config.codeResources.css.framework];
        if (frameworkStyles) {
          css += `\n/* ${uiComponent.name} Styles */\n${frameworkStyles}\n`;
        }
      }

      // Add custom component styles
      if (component.styling?.customCSS) {
        css += `\n/* Custom styles for ${component.id} */\n${component.styling.customCSS}\n`;
      }
    });

    // Add responsive styles using the responsive generator
    if (config.advancedOptions.responsive) {
      css += this.responsiveGenerator.generateResponsiveCSS(config);
    }

    // Add custom CSS
    if (config.codeResources.css.customCSS) {
      css += `\n/* Custom CSS */\n${config.codeResources.css.customCSS}\n`;
    }

    return css;
  }

  /**
   * Generate JavaScript content
   */
  private generateJavaScript(config: PageConfiguration): string | undefined {
    let js = '';

    // Add framework-specific JavaScript
    js += this.getFrameworkJS(config.codeResources.css.framework);

    // Add responsive navigation JavaScript
    if (config.advancedOptions.responsive) {
      js += this.responsiveGenerator.generateResponsiveNavJS();
    }

    // Add form validation if forms are present
    const hasForm = config.components.some(c => c.type === 'form' || c.id.includes('form'));
    if (hasForm) {
      js += this.generateFormValidationJS(config);
    }

    // Add custom JavaScript
    if (config.codeResources.javascript.customJS) {
      js += `\n/* Custom JavaScript */\n${config.codeResources.javascript.customJS}\n`;
    }

    return js.trim() || undefined;
  }

  /**
   * Generate AMPScript content
   */
  private generateAMPScript(config: PageConfiguration): string | undefined {
    if (!config.advancedOptions.ampscriptEnabled) {
      return undefined;
    }

    // Generate AMPScript blocks using the integration service
    const ampscriptBlocks = this.ampscriptIntegration.generateAMPScript(config);
    
    if (ampscriptBlocks.length === 0) {
      return undefined;
    }

    // Combine all AMPScript blocks
    return this.ampscriptIntegration.combineAMPScriptBlocks(ampscriptBlocks);
  }

  /**
   * Get framework base CSS
   */
  private getFrameworkBaseCSS(framework: Framework): string {
    switch (framework) {
      case 'bootstrap':
        return `/* Bootstrap Base Styles */
.container { max-width: 1200px; margin: 0 auto; padding: 0 15px; }
.row { display: flex; flex-wrap: wrap; margin: 0 -15px; }
.col { flex: 1; padding: 0 15px; }
.btn { display: inline-block; padding: 0.375rem 0.75rem; margin-bottom: 0; font-size: 1rem; font-weight: 400; line-height: 1.5; text-align: center; text-decoration: none; vertical-align: middle; cursor: pointer; border: 1px solid transparent; border-radius: 0.25rem; }
.btn-primary { color: #fff; background-color: #007bff; border-color: #007bff; }
.form-control { display: block; width: 100%; padding: 0.375rem 0.75rem; font-size: 1rem; line-height: 1.5; color: #495057; background-color: #fff; border: 1px solid #ced4da; border-radius: 0.25rem; }
`;

      case 'tailwind':
        return `/* Tailwind Base Styles */
.container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.btn { display: inline-block; padding: 0.5rem 1rem; font-weight: 500; text-align: center; text-decoration: none; border-radius: 0.375rem; transition: all 0.2s; }
.btn-primary { background-color: #3b82f6; color: white; }
.btn-primary:hover { background-color: #2563eb; }
.form-control { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; }
.form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
`;

      case 'vanilla':
        return `/* Vanilla CSS Base Styles */
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; border: none; cursor: pointer; font-size: 16px; }
.btn:hover { background: #0056b3; }
.form-control { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
.form-group { margin-bottom: 20px; }
label { display: block; margin-bottom: 5px; font-weight: bold; }
`;

      default:
        return '';
    }
  }



  /**
   * Get framework JavaScript
   */
  private getFrameworkJS(framework: Framework): string {
    switch (framework) {
      case 'bootstrap':
        return `/* Bootstrap JavaScript */
// Bootstrap components initialization would go here
`;
      default:
        return '';
    }
  }

  /**
   * Generate form validation JavaScript
   */
  private generateFormValidationJS(config: PageConfiguration): string {
    return `
/* Form Validation */
document.addEventListener('DOMContentLoaded', function() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      if (!validateForm(this)) {
        e.preventDefault();
      }
    });
  });
  
  function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        showError(field, 'This field is required');
        isValid = false;
      } else {
        clearError(field);
      }
      
      if (field.type === 'email' && field.value) {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(field.value)) {
          showError(field, 'Please enter a valid email address');
          isValid = false;
        }
      }
    });
    
    return isValid;
  }
  
  function showError(field, message) {
    clearError(field);
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    error.style.color = '#dc3545';
    error.style.fontSize = '14px';
    error.style.marginTop = '5px';
    field.parentNode.appendChild(error);
    field.style.borderColor = '#dc3545';
  }
  
  function clearError(field) {
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    field.style.borderColor = '';
  }
});
`;
  }



  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(html: string, css: string, javascript?: string): any {
    const htmlSize = new Blob([html]).size;
    const cssSize = new Blob([css]).size;
    const jsSize = javascript ? new Blob([javascript]).size : 0;
    
    // Estimate load time based on file sizes (rough calculation)
    const totalSize = htmlSize + cssSize + jsSize;
    const estimatedLoadTime = Math.max(500, totalSize / 1000); // Minimum 500ms, then 1ms per KB
    
    // Calculate optimization score (0-100)
    let optimizationScore = 100;
    if (totalSize > 100000) optimizationScore -= 20; // Large files
    if (cssSize > 50000) optimizationScore -= 15; // Large CSS
    if (jsSize > 50000) optimizationScore -= 15; // Large JS
    
    return {
      estimatedLoadTime,
      cssSize,
      jsSize,
      htmlSize,
      optimizationScore: Math.max(0, optimizationScore)
    };
  }

  /**
   * Generate code resources
   */
  private generateCodeResources(config: PageConfiguration, css: string, javascript?: string, ampscript?: string): any[] {
    const resources = [];

    // CSS resource
    resources.push({
      type: 'css',
      name: `${config.pageSettings.pageName}-styles`,
      content: css,
      description: 'Generated CSS styles for the cloud page'
    });

    // JavaScript resource
    if (javascript) {
      resources.push({
        type: 'javascript',
        name: `${config.pageSettings.pageName}-scripts`,
        content: javascript,
        description: 'Generated JavaScript for the cloud page'
      });
    }

    // AMPScript resource
    if (ampscript) {
      resources.push({
        type: 'ampscript',
        name: `${config.pageSettings.pageName}-ampscript`,
        content: ampscript,
        description: 'Generated AMPScript for the cloud page'
      });
    }

    return resources;
  }

  /**
   * Generate integration notes
   */
  private generateIntegrationNotes(config: PageConfiguration): string {
    return `# Integration Notes for ${config.pageSettings.pageName}

## Framework: ${config.codeResources.css.framework}

### Setup Instructions:
1. Create a new Cloud Page in SFMC
2. Copy the generated HTML into the page content
3. Create CSS code resource and link it to the page
${config.codeResources.javascript.customJS ? '4. Create JavaScript code resource and link it to the page' : ''}
${config.advancedOptions.ampscriptEnabled ? '5. Add AMPScript code to the page header' : ''}

### External Dependencies:
${config.codeResources.css.externalStylesheets?.map(url => `- CSS: ${url}`).join('\n') || 'None'}
${config.codeResources.javascript.externalScripts?.map(url => `- JavaScript: ${url}`).join('\n') || 'None'}

### Configuration Details:
- Page Type: ${config.pageSettings.pageType}
- Responsive: ${config.advancedOptions.responsive ? 'Yes' : 'No'}
- Mobile First: ${config.advancedOptions.mobileFirst ? 'Yes' : 'No'}
- Accessibility: ${config.advancedOptions.accessibility ? 'Yes' : 'No'}
- SEO Optimized: ${config.advancedOptions.seoOptimized ? 'Yes' : 'No'}
- AMPScript Enabled: ${config.advancedOptions.ampscriptEnabled ? 'Yes' : 'No'}
`;
  }

  /**
   * Generate testing guidelines
   */
  private generateTestingGuidelines(config: PageConfiguration): string {
    return `# Testing Guidelines for ${config.pageSettings.pageName}

## Browser Testing:
- Test in Chrome, Firefox, Safari, and Edge
- Verify responsive design on mobile devices
- Check form functionality and validation

## SFMC Testing:
- Test in SFMC Preview mode
- Verify AMPScript functionality (if enabled)
- Test data extension integration (if configured)
- Check email link tracking

## Performance Testing:
- Verify page load time < 3 seconds
- Check image optimization
- Validate CSS and JavaScript minification

## Accessibility Testing:
${config.advancedOptions.accessibility ? `- Run WAVE accessibility checker
- Verify keyboard navigation
- Check screen reader compatibility
- Validate color contrast ratios` : '- Accessibility features are disabled'}

## Form Testing (if applicable):
- Test all form fields and validation
- Verify form submission handling
- Check error message display
- Test required field validation
`;
  }

  /**
   * Generate deployment instructions
   */
  private generateDeploymentInstructions(config: PageConfiguration): string {
    return `# Deployment Instructions for ${config.pageSettings.pageName}

## Step 1: Create Cloud Page
1. Log into SFMC
2. Navigate to Web Studio > Cloud Pages
3. Click "Create" > "Cloud Page"
4. Enter page name: "${config.pageSettings.pageName}"
5. Set published URL: "${config.pageSettings.publishedURL || 'your-domain.com/page-url'}"

## Step 2: Upload Code Resources
1. Go to Web Studio > Code Resources
2. Create new CSS resource: "${config.pageSettings.pageName}-styles"
3. Copy and paste the generated CSS content
${config.codeResources.javascript.customJS ? `4. Create new JavaScript resource: "${config.pageSettings.pageName}-scripts"
5. Copy and paste the generated JavaScript content` : ''}

## Step 3: Configure Page Content
1. Return to your Cloud Page
2. Copy and paste the generated HTML content
3. Link the CSS code resource in the page settings
${config.codeResources.javascript.customJS ? '4. Link the JavaScript code resource in the page settings' : ''}

## Step 4: Configure Page Settings
- Page Type: ${config.pageSettings.pageType}
- Title: ${config.pageSettings.title}
- Description: ${config.pageSettings.description || 'Not specified'}
- Keywords: ${config.pageSettings.keywords?.join(', ') || 'Not specified'}

## Step 5: Test and Publish
1. Use "Preview" to test the page
2. Check responsive design on different devices
3. Test all interactive elements
4. Publish the page when ready

## Additional Configuration:
${config.advancedOptions.dataExtensionIntegration?.length ? `- Data Extensions: ${config.advancedOptions.dataExtensionIntegration.join(', ')}` : '- No data extension integration'}
${config.advancedOptions.ampscriptEnabled ? '- AMPScript is enabled - ensure proper testing' : '- AMPScript is disabled'}
`;
  }

  /**
   * Generate mobile-first responsive page
   */
  async generateMobileFirstPage(config: PageConfiguration): Promise<GeneratedOutput> {
    // Ensure mobile-first is enabled
    config.advancedOptions.mobileFirst = true;
    config.advancedOptions.responsive = true;
    
    return await this.generatePage(config);
  }

  /**
   * Generate framework-specific page
   */
  async generateFrameworkSpecificPage(config: PageConfiguration, framework: Framework): Promise<GeneratedOutput> {
    // Override framework in configuration
    config.codeResources.css.framework = framework;
    
    return await this.generatePage(config);
  }

  /**
   * Generate page with AMPScript integration
   */
  async generatePageWithAMPScript(config: PageConfiguration, ampscriptConfig?: any): Promise<GeneratedOutput> {
    // Enable AMPScript
    config.advancedOptions.ampscriptEnabled = true;
    
    // Add AMPScript configuration if provided
    if (ampscriptConfig) {
      config.advancedOptions.dataExtensionIntegration = ampscriptConfig.dataExtensions || [];
    }
    
    return await this.generatePage(config);
  }

  /**
   * Get responsive breakpoints for framework
   */
  getResponsiveBreakpoints(framework: Framework): { mobile: number; tablet: number; desktop: number } {
    switch (framework) {
      case 'bootstrap':
        return { mobile: 576, tablet: 768, desktop: 992 };
      case 'tailwind':
        return { mobile: 640, tablet: 768, desktop: 1024 };
      case 'vanilla':
        return { mobile: 480, tablet: 768, desktop: 1024 };
      default:
        return { mobile: 480, tablet: 768, desktop: 1024 };
    }
  }

  /**
   * Validate responsive configuration
   */
  validateResponsiveConfig(config: PageConfiguration): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check if responsive is enabled but no breakpoints defined
    if (config.advancedOptions.responsive) {
      const hasResponsiveComponents = config.components.some(c => c.styling?.responsive);
      
      if (!hasResponsiveComponents) {
        warnings.push({
          field: 'components',
          message: 'Responsive design is enabled but no components have responsive styling defined',
          suggestion: 'Add responsive styling to components or disable responsive design'
        });
      }
    }

    // Check mobile-first configuration
    if (config.advancedOptions.mobileFirst && !config.advancedOptions.responsive) {
      errors.push({
        field: 'advancedOptions.mobileFirst',
        message: 'Mobile-first design requires responsive design to be enabled',
        code: 'MOBILE_FIRST_REQUIRES_RESPONSIVE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Merge configurations
   */
  private mergeConfigurations(base: PageConfiguration, customizations: Partial<PageConfiguration>): PageConfiguration {
    return {
      ...base,
      ...customizations,
      pageSettings: { ...base.pageSettings, ...customizations.pageSettings },
      codeResources: { 
        ...base.codeResources, 
        ...customizations.codeResources,
        css: { ...base.codeResources.css, ...customizations.codeResources?.css },
        javascript: { ...base.codeResources.javascript, ...customizations.codeResources?.javascript }
      },
      advancedOptions: { ...base.advancedOptions, ...customizations.advancedOptions },
      layout: { ...base.layout, ...customizations.layout },
      components: customizations.components || base.components
    };
  }
}

export const cloudPagesService = new CloudPagesService();