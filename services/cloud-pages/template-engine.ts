/**
 * Template Engine
 * Handles responsive template system with framework support
 */

import { 
  PageConfiguration, 
  PageTemplate, 
  Framework, 
  PageType,
  ComponentConfiguration,
  UIComponent
} from '../../types/cloud-pages';

export class TemplateEngine {
  private templates: Map<string, PageTemplate> = new Map();
  private components: Map<string, UIComponent> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeDefaultComponents();
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): PageTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PageTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by page type
   */
  getTemplatesByType(pageType: PageType): PageTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.pageType === pageType);
  }

  /**
   * Get templates by framework
   */
  getTemplatesByFramework(framework: Framework): PageTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.framework === framework);
  }

  /**
   * Register a new template
   */
  registerTemplate(template: PageTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get component by ID
   */
  getComponent(componentId: string): UIComponent | undefined {
    return this.components.get(componentId);
  }

  /**
   * Get all components
   */
  getAllComponents(): UIComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: string): UIComponent[] {
    return Array.from(this.components.values())
      .filter(component => component.category === category);
  }

  /**
   * Register a new component
   */
  registerComponent(component: UIComponent): void {
    this.components.set(component.id, component);
  }

  /**
   * Generate base HTML structure for a framework
   */
  generateBaseStructure(config: PageConfiguration): string {
    const { framework } = config.codeResources.css;
    const { pageSettings, layout, advancedOptions } = config;

    const doctype = '<!DOCTYPE html>';
    const htmlTag = `<html lang="en"${advancedOptions.accessibility ? ' role="document"' : ''}>`;
    
    const head = this.generateHead(config);
    const body = this.generateBody(config);

    return `${doctype}\n${htmlTag}\n${head}\n${body}\n</html>`;
  }

  /**
   * Generate HTML head section
   */
  private generateHead(config: PageConfiguration): string {
    const { pageSettings, codeResources, advancedOptions } = config;
    const { framework } = codeResources.css;

    let head = '<head>\n';
    head += '  <meta charset="UTF-8">\n';
    head += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    
    if (advancedOptions.seoOptimized) {
      head += `  <title>${pageSettings.title}</title>\n`;
      if (pageSettings.description) {
        head += `  <meta name="description" content="${pageSettings.description}">\n`;
      }
      if (pageSettings.keywords && pageSettings.keywords.length > 0) {
        head += `  <meta name="keywords" content="${pageSettings.keywords.join(', ')}">\n`;
      }
    }

    // Framework CSS
    head += this.getFrameworkCSS(framework);

    // External stylesheets
    if (codeResources.css.externalStylesheets) {
      codeResources.css.externalStylesheets.forEach(stylesheet => {
        head += `  <link rel="stylesheet" href="${stylesheet}">\n`;
      });
    }

    // Custom CSS
    if (codeResources.css.customCSS) {
      head += '  <style>\n';
      head += `    ${codeResources.css.customCSS}\n`;
      head += '  </style>\n';
    }

    head += '</head>';
    return head;
  }

  /**
   * Generate HTML body section
   */
  private generateBody(config: PageConfiguration): string {
    const { layout, components } = config;
    
    let body = '<body>\n';
    
    // Container
    const containerClass = this.getContainerClass(config);
    body += `  <div class="${containerClass}">\n`;

    // Header
    if (layout.header) {
      body += this.generateHeader(config);
    }

    // Main content area
    body += this.generateMainContent(config);

    // Footer
    if (layout.footer) {
      body += this.generateFooter(config);
    }

    body += '  </div>\n';

    // External scripts
    if (config.codeResources.javascript.externalScripts) {
      config.codeResources.javascript.externalScripts.forEach(script => {
        body += `  <script src="${script}"></script>\n`;
      });
    }

    // Custom JavaScript
    if (config.codeResources.javascript.customJS) {
      body += '  <script>\n';
      body += `    ${config.codeResources.javascript.customJS}\n`;
      body += '  </script>\n';
    }

    body += '</body>';
    return body;
  }

  /**
   * Get framework-specific CSS links
   */
  private getFrameworkCSS(framework: Framework): string {
    switch (framework) {
      case 'bootstrap':
        return '  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">\n';
      case 'tailwind':
        return '  <script src="https://cdn.tailwindcss.com"></script>\n';
      case 'vanilla':
        return '  <!-- Vanilla CSS - No framework -->\n';
      default:
        return '';
    }
  }

  /**
   * Get container class based on framework and configuration
   */
  private getContainerClass(config: PageConfiguration): string {
    const { framework } = config.codeResources.css;
    const { containerWidth } = config.layout;

    switch (framework) {
      case 'bootstrap':
        return containerWidth === 'fluid' ? 'container-fluid' : 'container';
      case 'tailwind':
        return containerWidth === 'fluid' ? 'w-full' : 'container mx-auto';
      case 'vanilla':
        return 'page-container';
      default:
        return 'container';
    }
  }

  /**
   * Generate header section
   */
  private generateHeader(config: PageConfiguration): string {
    const headerComponent = config.components.find(c => c.type === 'header');
    if (headerComponent) {
      return this.renderComponent(headerComponent, config);
    }

    // Default header
    const { framework } = config.codeResources.css;
    switch (framework) {
      case 'bootstrap':
        return `    <header class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container">
        <a class="navbar-brand" href="#">${config.pageSettings.title}</a>
      </div>
    </header>\n`;
      case 'tailwind':
        return `    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold">${config.pageSettings.title}</h1>
          </div>
        </div>
      </div>
    </header>\n`;
      default:
        return `    <header class="site-header">
      <h1>${config.pageSettings.title}</h1>
    </header>\n`;
    }
  }

  /**
   * Generate main content area
   */
  private generateMainContent(config: PageConfiguration): string {
    const { layout, components } = config;
    
    let content = '    <main class="main-content">\n';
    
    // Sort components by position
    const sortedComponents = components
      .filter(c => c.type !== 'header' && c.type !== 'footer')
      .sort((a, b) => a.position - b.position);

    // Render components
    sortedComponents.forEach(component => {
      content += this.renderComponent(component, config);
    });

    // If no components, add default content
    if (sortedComponents.length === 0) {
      content += this.generateDefaultContent(config);
    }

    content += '    </main>\n';
    return content;
  }

  /**
   * Generate footer section
   */
  private generateFooter(config: PageConfiguration): string {
    const footerComponent = config.components.find(c => c.type === 'footer');
    if (footerComponent) {
      return this.renderComponent(footerComponent, config);
    }

    // Default footer
    const { framework } = config.codeResources.css;
    switch (framework) {
      case 'bootstrap':
        return `    <footer class="bg-light text-center py-3 mt-5">
      <div class="container">
        <p class="mb-0">&copy; 2024 ${config.pageSettings.title}. All rights reserved.</p>
      </div>
    </footer>\n`;
      case 'tailwind':
        return `    <footer class="bg-gray-50 border-t">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <p class="text-center text-sm text-gray-500">
          &copy; 2024 ${config.pageSettings.title}. All rights reserved.
        </p>
      </div>
    </footer>\n`;
      default:
        return `    <footer class="site-footer">
      <p>&copy; 2024 ${config.pageSettings.title}. All rights reserved.</p>
    </footer>\n`;
    }
  }

  /**
   * Render a component
   */
  private renderComponent(componentConfig: ComponentConfiguration, pageConfig: PageConfiguration): string {
    const component = this.getComponent(componentConfig.type);
    if (!component) {
      return `<!-- Component ${componentConfig.type} not found -->\n`;
    }

    let html = component.template;
    
    // Replace placeholders with actual values
    Object.entries(componentConfig.props).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), String(value));
    });

    // Add content if provided
    if (componentConfig.content) {
      html = html.replace('{{content}}', componentConfig.content);
    }

    // Add AMPScript if provided
    if (componentConfig.ampscript && pageConfig.advancedOptions.ampscriptEnabled) {
      html = `%%[\n${componentConfig.ampscript}\n]%%\n${html}`;
    }

    return `      ${html}\n`;
  }

  /**
   * Generate default content when no components are provided
   */
  private generateDefaultContent(config: PageConfiguration): string {
    const { framework } = config.codeResources.css;
    
    switch (framework) {
      case 'bootstrap':
        return `      <div class="row">
        <div class="col-12">
          <h2>Welcome to ${config.pageSettings.title}</h2>
          <p class="lead">${config.pageSettings.description || 'This is your new SFMC cloud page.'}</p>
        </div>
      </div>\n`;
      case 'tailwind':
        return `      <div class="py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 class="text-3xl font-bold text-gray-900">Welcome to ${config.pageSettings.title}</h2>
          <p class="mt-4 text-lg text-gray-600">${config.pageSettings.description || 'This is your new SFMC cloud page.'}</p>
        </div>
      </div>\n`;
      default:
        return `      <div class="content-section">
        <h2>Welcome to ${config.pageSettings.title}</h2>
        <p>${config.pageSettings.description || 'This is your new SFMC cloud page.'}</p>
      </div>\n`;
    }
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // Landing page templates
    this.registerTemplate({
      id: 'bootstrap-landing',
      name: 'Bootstrap Landing Page',
      description: 'Responsive landing page using Bootstrap framework',
      category: 'Landing Pages',
      pageType: 'landing',
      framework: 'bootstrap',
      configuration: this.createBootstrapLandingConfig(),
      tags: ['bootstrap', 'responsive', 'landing']
    });

    this.registerTemplate({
      id: 'tailwind-landing',
      name: 'Tailwind Landing Page',
      description: 'Modern landing page using Tailwind CSS',
      category: 'Landing Pages',
      pageType: 'landing',
      framework: 'tailwind',
      configuration: this.createTailwindLandingConfig(),
      tags: ['tailwind', 'modern', 'landing']
    });

    // Form templates
    this.registerTemplate({
      id: 'bootstrap-form',
      name: 'Bootstrap Contact Form',
      description: 'Contact form with Bootstrap styling',
      category: 'Forms',
      pageType: 'form',
      framework: 'bootstrap',
      configuration: this.createBootstrapFormConfig(),
      tags: ['bootstrap', 'form', 'contact']
    });
  }

  /**
   * Initialize default UI components
   */
  private initializeDefaultComponents(): void {
    // Hero component
    this.registerComponent({
      id: 'hero',
      name: 'Hero Section',
      category: 'Layout',
      description: 'Large hero section with title and call-to-action',
      ampscriptSupport: true,
      props: [
        { name: 'title', type: 'string', required: true, default: 'Welcome' },
        { name: 'subtitle', type: 'string', required: false, default: '' },
        { name: 'ctaText', type: 'string', required: false, default: 'Get Started' },
        { name: 'ctaUrl', type: 'string', required: false, default: '#' }
      ],
      template: `<section class="hero-section">
  <div class="hero-content">
    <h1>{{title}}</h1>
    <p>{{subtitle}}</p>
    <a href="{{ctaUrl}}" class="btn btn-primary">{{ctaText}}</a>
  </div>
</section>`,
      styles: {
        bootstrap: 'hero-section { padding: 100px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }',
        tailwind: 'hero-section { @apply py-24 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center; }',
        vanilla: 'hero-section { padding: 100px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }'
      }
    });

    // Form component
    this.registerComponent({
      id: 'contact-form',
      name: 'Contact Form',
      category: 'Forms',
      description: 'Basic contact form with validation',
      ampscriptSupport: true,
      props: [
        { name: 'action', type: 'string', required: true, default: '#' },
        { name: 'method', type: 'string', required: false, default: 'POST' }
      ],
      template: `<form action="{{action}}" method="{{method}}" class="contact-form">
  <div class="form-group">
    <label for="name">Name</label>
    <input type="text" id="name" name="name" required>
  </div>
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required>
  </div>
  <div class="form-group">
    <label for="message">Message</label>
    <textarea id="message" name="message" rows="5" required></textarea>
  </div>
  <button type="submit" class="btn btn-primary">Send Message</button>
</form>`,
      styles: {
        bootstrap: '.contact-form .form-group { margin-bottom: 1rem; } .contact-form label { font-weight: bold; }',
        tailwind: '.contact-form .form-group { @apply mb-4; } .contact-form label { @apply font-semibold; }',
        vanilla: '.contact-form .form-group { margin-bottom: 1rem; } .contact-form label { font-weight: bold; }'
      }
    });
  }

  /**
   * Create default configuration templates
   */
  private createBootstrapLandingConfig(): PageConfiguration {
    // Implementation would return a complete Bootstrap landing page configuration
    // This is a simplified version for brevity
    return {
      pageSettings: {
        pageName: 'Bootstrap Landing',
        publishedURL: '',
        pageType: 'landing',
        title: 'Welcome to Our Service',
        description: 'Professional landing page built with Bootstrap'
      },
      codeResources: {
        css: { framework: 'bootstrap' },
        javascript: { ampscriptIntegration: false }
      },
      advancedOptions: {
        responsive: true,
        mobileFirst: true,
        accessibility: true,
        seoOptimized: true,
        ampscriptEnabled: false
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

  private createTailwindLandingConfig(): PageConfiguration {
    // Similar implementation for Tailwind
    return {
      pageSettings: {
        pageName: 'Tailwind Landing',
        publishedURL: '',
        pageType: 'landing',
        title: 'Modern Landing Page',
        description: 'Sleek landing page built with Tailwind CSS'
      },
      codeResources: {
        css: { framework: 'tailwind' },
        javascript: { ampscriptIntegration: false }
      },
      advancedOptions: {
        responsive: true,
        mobileFirst: true,
        accessibility: true,
        seoOptimized: true,
        ampscriptEnabled: false
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

  private createBootstrapFormConfig(): PageConfiguration {
    // Similar implementation for Bootstrap form
    return {
      pageSettings: {
        pageName: 'Contact Form',
        publishedURL: '',
        pageType: 'form',
        title: 'Contact Us',
        description: 'Get in touch with our team'
      },
      codeResources: {
        css: { framework: 'bootstrap' },
        javascript: { ampscriptIntegration: true }
      },
      advancedOptions: {
        responsive: true,
        mobileFirst: true,
        accessibility: true,
        seoOptimized: true,
        ampscriptEnabled: true
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

export const templateEngine = new TemplateEngine();