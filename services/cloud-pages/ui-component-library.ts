/**
 * UI Component Library
 * Reusable UI components optimized for SFMC cloud pages
 */

import { UIComponent, Framework, ComponentProp } from '../../types/cloud-pages';

export class UIComponentLibrary {
  private components: Map<string, UIComponent> = new Map();

  constructor() {
    this.initializeComponents();
  }

  /**
   * Get component by ID
   */
  getComponent(id: string): UIComponent | undefined {
    return this.components.get(id);
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
   * Get component template for specific framework
   */
  getComponentTemplate(componentId: string, framework: Framework, props: Record<string, any> = {}): string {
    const component = this.getComponent(componentId);
    if (!component) {
      return `<!-- Component ${componentId} not found -->`;
    }

    let template = component.template;
    
    // Replace framework-specific classes
    template = this.applyFrameworkStyles(template, framework, component);
    
    // Replace prop placeholders
    Object.entries(props).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(placeholder, String(value));
    });

    // Apply default values for missing props
    component.props.forEach(prop => {
      if (!(prop.name in props) && prop.default !== undefined) {
        const placeholder = new RegExp(`{{${prop.name}}}`, 'g');
        template = template.replace(placeholder, String(prop.default));
      }
    });

    return template;
  }

  /**
   * Apply framework-specific styles to template
   */
  private applyFrameworkStyles(template: string, framework: Framework, component: UIComponent): string {
    const frameworkStyles = component.styles[framework];
    if (!frameworkStyles) {
      return template;
    }

    // Replace generic class names with framework-specific ones
    switch (framework) {
      case 'bootstrap':
        return this.applyBootstrapStyles(template);
      case 'tailwind':
        return this.applyTailwindStyles(template);
      case 'vanilla':
        return this.applyVanillaStyles(template);
      default:
        return template;
    }
  }

  /**
   * Apply Bootstrap-specific class mappings
   */
  private applyBootstrapStyles(template: string): string {
    return template
      .replace(/class="btn btn-primary"/g, 'class="btn btn-primary"')
      .replace(/class="form-group"/g, 'class="mb-3"')
      .replace(/class="form-control"/g, 'class="form-control"')
      .replace(/class="card"/g, 'class="card"')
      .replace(/class="container"/g, 'class="container"')
      .replace(/class="row"/g, 'class="row"')
      .replace(/class="col"/g, 'class="col"');
  }

  /**
   * Apply Tailwind-specific class mappings
   */
  private applyTailwindStyles(template: string): string {
    return template
      .replace(/class="btn btn-primary"/g, 'class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"')
      .replace(/class="form-group"/g, 'class="mb-4"')
      .replace(/class="form-control"/g, 'class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"')
      .replace(/class="card"/g, 'class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"')
      .replace(/class="container"/g, 'class="container mx-auto px-4"')
      .replace(/class="row"/g, 'class="flex flex-wrap"')
      .replace(/class="col"/g, 'class="w-full md:w-1/2 lg:w-1/3 px-4"');
  }

  /**
   * Apply vanilla CSS class mappings
   */
  private applyVanillaStyles(template: string): string {
    return template
      .replace(/class="btn btn-primary"/g, 'class="button button-primary"')
      .replace(/class="form-group"/g, 'class="form-group"')
      .replace(/class="form-control"/g, 'class="input"')
      .replace(/class="card"/g, 'class="card"')
      .replace(/class="container"/g, 'class="container"')
      .replace(/class="row"/g, 'class="row"')
      .replace(/class="col"/g, 'class="column"');
  }

  /**
   * Validate component props
   */
  validateProps(componentId: string, props: Record<string, any>): { isValid: boolean; errors: string[] } {
    const component = this.getComponent(componentId);
    if (!component) {
      return { isValid: false, errors: [`Component ${componentId} not found`] };
    }

    const errors: string[] = [];

    component.props.forEach(prop => {
      const value = props[prop.name];

      // Check required props
      if (prop.required && (value === undefined || value === null || value === '')) {
        errors.push(`Property '${prop.name}' is required`);
        return;
      }

      // Skip validation if prop is not provided and not required
      if (value === undefined || value === null) {
        return;
      }

      // Type validation
      if (!this.validatePropType(value, prop.type)) {
        errors.push(`Property '${prop.name}' must be of type ${prop.type}`);
      }

      // Additional validation rules
      if (prop.validation) {
        const validationErrors = this.validatePropRules(prop.name, value, prop.validation);
        errors.push(...validationErrors);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate prop type
   */
  private validatePropType(value: any, type: ComponentProp['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate prop against validation rules
   */
  private validatePropRules(propName: string, value: any, validation: NonNullable<ComponentProp['validation']>): string[] {
    const errors: string[] = [];

    if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
      errors.push(`Property '${propName}' must be at least ${validation.min}`);
    }

    if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
      errors.push(`Property '${propName}' must be at most ${validation.max}`);
    }

    if (validation.pattern && typeof value === 'string' && !new RegExp(validation.pattern).test(value)) {
      errors.push(`Property '${propName}' does not match required pattern`);
    }

    if (validation.options && !validation.options.includes(value)) {
      errors.push(`Property '${propName}' must be one of: ${validation.options.join(', ')}`);
    }

    return errors;
  }

  /**
   * Initialize default components
   */
  private initializeComponents(): void {
    // Navigation Components
    this.registerComponent({
      id: 'navbar',
      name: 'Navigation Bar',
      category: 'Navigation',
      description: 'Responsive navigation bar with brand and menu items',
      ampscriptSupport: true,
      props: [
        { name: 'brand', type: 'string', required: true, default: 'Brand' },
        { name: 'brandUrl', type: 'string', required: false, default: '#' },
        { name: 'menuItems', type: 'array', required: false, default: [] },
        { name: 'fixed', type: 'boolean', required: false, default: false }
      ],
      template: `<nav class="navbar navbar-expand-lg navbar-light bg-light{{#if fixed}} fixed-top{{/if}}">
  <div class="container">
    <a class="navbar-brand" href="{{brandUrl}}">{{brand}}</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ms-auto">
        {{#each menuItems}}
        <li class="nav-item">
          <a class="nav-link" href="{{url}}">{{text}}</a>
        </li>
        {{/each}}
      </ul>
    </div>
  </div>
</nav>`,
      styles: {
        bootstrap: '.navbar { box-shadow: 0 2px 4px rgba(0,0,0,.1); }',
        tailwind: '.navbar { @apply bg-white shadow-md; }',
        vanilla: '.navbar { background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.1); padding: 1rem 0; }'
      }
    });

    // Hero Section
    this.registerComponent({
      id: 'hero-section',
      name: 'Hero Section',
      category: 'Layout',
      description: 'Large hero section with background image, title, and CTA',
      ampscriptSupport: true,
      props: [
        { name: 'title', type: 'string', required: true, default: 'Welcome to Our Service' },
        { name: 'subtitle', type: 'string', required: false, default: '' },
        { name: 'ctaText', type: 'string', required: false, default: 'Get Started' },
        { name: 'ctaUrl', type: 'string', required: false, default: '#' },
        { name: 'backgroundImage', type: 'string', required: false, default: '' },
        { name: 'height', type: 'string', required: false, default: '500px' }
      ],
      template: `<section class="hero-section" style="{{#if backgroundImage}}background-image: url('{{backgroundImage}}');{{/if}} min-height: {{height}};">
  <div class="hero-overlay">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title">{{title}}</h1>
        {{#if subtitle}}
        <p class="hero-subtitle">{{subtitle}}</p>
        {{/if}}
        {{#if ctaText}}
        <a href="{{ctaUrl}}" class="btn btn-primary btn-lg">{{ctaText}}</a>
        {{/if}}
      </div>
    </div>
  </div>
</section>`,
      styles: {
        bootstrap: '.hero-section { background-size: cover; background-position: center; display: flex; align-items: center; } .hero-overlay { background: rgba(0,0,0,0.5); width: 100%; } .hero-content { text-align: center; color: white; }',
        tailwind: '.hero-section { @apply bg-cover bg-center flex items-center; } .hero-overlay { @apply bg-black bg-opacity-50 w-full; } .hero-content { @apply text-center text-white; }',
        vanilla: '.hero-section { background-size: cover; background-position: center; display: flex; align-items: center; } .hero-overlay { background: rgba(0,0,0,0.5); width: 100%; } .hero-content { text-align: center; color: white; }'
      }
    });

    // Contact Form
    this.registerComponent({
      id: 'contact-form',
      name: 'Contact Form',
      category: 'Forms',
      description: 'Responsive contact form with validation',
      ampscriptSupport: true,
      props: [
        { name: 'action', type: 'string', required: true, default: '#' },
        { name: 'method', type: 'string', required: false, default: 'POST' },
        { name: 'title', type: 'string', required: false, default: 'Contact Us' },
        { name: 'submitText', type: 'string', required: false, default: 'Send Message' }
      ],
      template: `<section class="contact-form-section">
  <div class="container">
    {{#if title}}
    <h2 class="form-title">{{title}}</h2>
    {{/if}}
    <form action="{{action}}" method="{{method}}" class="contact-form">
      <div class="form-group">
        <label for="firstName">First Name *</label>
        <input type="text" id="firstName" name="firstName" class="form-control" required>
      </div>
      <div class="form-group">
        <label for="lastName">Last Name *</label>
        <input type="text" id="lastName" name="lastName" class="form-control" required>
      </div>
      <div class="form-group">
        <label for="email">Email Address *</label>
        <input type="email" id="email" name="email" class="form-control" required>
      </div>
      <div class="form-group">
        <label for="phone">Phone Number</label>
        <input type="tel" id="phone" name="phone" class="form-control">
      </div>
      <div class="form-group">
        <label for="message">Message *</label>
        <textarea id="message" name="message" rows="5" class="form-control" required></textarea>
      </div>
      <button type="submit" class="btn btn-primary">{{submitText}}</button>
    </form>
  </div>
</section>`,
      styles: {
        bootstrap: '.contact-form-section { padding: 60px 0; } .form-title { text-align: center; margin-bottom: 40px; } .contact-form { max-width: 600px; margin: 0 auto; }',
        tailwind: '.contact-form-section { @apply py-16; } .form-title { @apply text-center mb-10 text-3xl font-bold; } .contact-form { @apply max-w-2xl mx-auto; }',
        vanilla: '.contact-form-section { padding: 60px 0; } .form-title { text-align: center; margin-bottom: 40px; font-size: 2rem; } .contact-form { max-width: 600px; margin: 0 auto; }'
      }
    });

    // Feature Cards
    this.registerComponent({
      id: 'feature-cards',
      name: 'Feature Cards',
      category: 'Content',
      description: 'Grid of feature cards with icons and descriptions',
      ampscriptSupport: false,
      props: [
        { name: 'title', type: 'string', required: false, default: 'Our Features' },
        { name: 'features', type: 'array', required: true, default: [] },
        { name: 'columns', type: 'number', required: false, default: 3, validation: { min: 1, max: 4 } }
      ],
      template: `<section class="features-section">
  <div class="container">
    {{#if title}}
    <h2 class="section-title">{{title}}</h2>
    {{/if}}
    <div class="features-grid" data-columns="{{columns}}">
      {{#each features}}
      <div class="feature-card">
        {{#if icon}}
        <div class="feature-icon">
          <i class="{{icon}}"></i>
        </div>
        {{/if}}
        <h3 class="feature-title">{{title}}</h3>
        <p class="feature-description">{{description}}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
      styles: {
        bootstrap: '.features-section { padding: 80px 0; } .section-title { text-align: center; margin-bottom: 60px; } .features-grid { display: grid; gap: 30px; } .features-grid[data-columns="3"] { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); } .feature-card { text-align: center; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }',
        tailwind: '.features-section { @apply py-20; } .section-title { @apply text-center mb-16 text-4xl font-bold; } .features-grid { @apply grid gap-8; } .features-grid[data-columns="3"] { @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3; } .feature-card { @apply text-center p-8 rounded-lg shadow-lg; }',
        vanilla: '.features-section { padding: 80px 0; } .section-title { text-align: center; margin-bottom: 60px; font-size: 2.5rem; } .features-grid { display: grid; gap: 30px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); } .feature-card { text-align: center; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }'
      }
    });

    // Newsletter Signup
    this.registerComponent({
      id: 'newsletter-signup',
      name: 'Newsletter Signup',
      category: 'Forms',
      description: 'Email newsletter subscription form',
      ampscriptSupport: true,
      props: [
        { name: 'title', type: 'string', required: false, default: 'Subscribe to Our Newsletter' },
        { name: 'description', type: 'string', required: false, default: 'Stay updated with our latest news and offers.' },
        { name: 'action', type: 'string', required: true, default: '#' },
        { name: 'buttonText', type: 'string', required: false, default: 'Subscribe' },
        { name: 'placeholder', type: 'string', required: false, default: 'Enter your email address' }
      ],
      template: `<section class="newsletter-section">
  <div class="container">
    <div class="newsletter-content">
      {{#if title}}
      <h2 class="newsletter-title">{{title}}</h2>
      {{/if}}
      {{#if description}}
      <p class="newsletter-description">{{description}}</p>
      {{/if}}
      <form action="{{action}}" method="POST" class="newsletter-form">
        <div class="form-group">
          <input type="email" name="email" class="form-control" placeholder="{{placeholder}}" required>
          <button type="submit" class="btn btn-primary">{{buttonText}}</button>
        </div>
      </form>
    </div>
  </div>
</section>`,
      styles: {
        bootstrap: '.newsletter-section { background: #f8f9fa; padding: 60px 0; } .newsletter-content { text-align: center; max-width: 600px; margin: 0 auto; } .newsletter-form .form-group { display: flex; gap: 10px; margin-top: 30px; } .newsletter-form input { flex: 1; }',
        tailwind: '.newsletter-section { @apply bg-gray-50 py-16; } .newsletter-content { @apply text-center max-w-2xl mx-auto; } .newsletter-form .form-group { @apply flex gap-3 mt-8; } .newsletter-form input { @apply flex-1; }',
        vanilla: '.newsletter-section { background: #f8f9fa; padding: 60px 0; } .newsletter-content { text-align: center; max-width: 600px; margin: 0 auto; } .newsletter-form .form-group { display: flex; gap: 10px; margin-top: 30px; } .newsletter-form input { flex: 1; }'
      }
    });

    // Footer
    this.registerComponent({
      id: 'footer',
      name: 'Footer',
      category: 'Layout',
      description: 'Site footer with links and copyright',
      ampscriptSupport: false,
      props: [
        { name: 'companyName', type: 'string', required: true, default: 'Company Name' },
        { name: 'year', type: 'string', required: false, default: new Date().getFullYear().toString() },
        { name: 'links', type: 'array', required: false, default: [] },
        { name: 'socialLinks', type: 'array', required: false, default: [] }
      ],
      template: `<footer class="site-footer">
  <div class="container">
    <div class="footer-content">
      {{#if links.length}}
      <div class="footer-links">
        {{#each links}}
        <a href="{{url}}">{{text}}</a>
        {{/each}}
      </div>
      {{/if}}
      {{#if socialLinks.length}}
      <div class="social-links">
        {{#each socialLinks}}
        <a href="{{url}}" target="_blank" rel="noopener">
          <i class="{{icon}}"></i>
        </a>
        {{/each}}
      </div>
      {{/if}}
      <div class="copyright">
        <p>&copy; {{year}} {{companyName}}. All rights reserved.</p>
      </div>
    </div>
  </div>
</footer>`,
      styles: {
        bootstrap: '.site-footer { background: #343a40; color: white; padding: 40px 0 20px; } .footer-content { text-align: center; } .footer-links { margin-bottom: 20px; } .footer-links a { color: #adb5bd; margin: 0 15px; text-decoration: none; } .social-links a { color: #adb5bd; margin: 0 10px; font-size: 1.2rem; }',
        tailwind: '.site-footer { @apply bg-gray-800 text-white py-10; } .footer-content { @apply text-center; } .footer-links { @apply mb-5; } .footer-links a { @apply text-gray-300 mx-4 no-underline hover:text-white; } .social-links a { @apply text-gray-300 mx-3 text-xl hover:text-white; }',
        vanilla: '.site-footer { background: #343a40; color: white; padding: 40px 0 20px; } .footer-content { text-align: center; } .footer-links { margin-bottom: 20px; } .footer-links a { color: #adb5bd; margin: 0 15px; text-decoration: none; } .social-links a { color: #adb5bd; margin: 0 10px; font-size: 1.2rem; }'
      }
    });
  }
}

export const uiComponentLibrary = new UIComponentLibrary();