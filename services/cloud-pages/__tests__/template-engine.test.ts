/**
 * Template Engine Tests
 */

import { TemplateEngine } from '../template-engine';
import { PageConfiguration } from '../../../types/cloud-pages';

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;

  beforeEach(() => {
    templateEngine = new TemplateEngine();
  });

  describe('Template Management', () => {
    it('should have default templates loaded', () => {
      const templates = templateEngine.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const bootstrapTemplate = templates.find(t => t.id === 'bootstrap-landing');
      expect(bootstrapTemplate).toBeDefined();
      expect(bootstrapTemplate?.framework).toBe('bootstrap');
      expect(bootstrapTemplate?.pageType).toBe('landing');
    });

    it('should get template by ID', () => {
      const template = templateEngine.getTemplate('bootstrap-landing');
      expect(template).toBeDefined();
      expect(template?.id).toBe('bootstrap-landing');
    });

    it('should return undefined for non-existent template', () => {
      const template = templateEngine.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });

    it('should filter templates by type', () => {
      const landingTemplates = templateEngine.getTemplatesByType('landing');
      expect(landingTemplates.length).toBeGreaterThan(0);
      landingTemplates.forEach(template => {
        expect(template.pageType).toBe('landing');
      });
    });

    it('should filter templates by framework', () => {
      const bootstrapTemplates = templateEngine.getTemplatesByFramework('bootstrap');
      expect(bootstrapTemplates.length).toBeGreaterThan(0);
      bootstrapTemplates.forEach(template => {
        expect(template.framework).toBe('bootstrap');
      });
    });

    it('should register new template', () => {
      const newTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        category: 'Test',
        pageType: 'custom' as const,
        framework: 'vanilla' as const,
        configuration: {} as PageConfiguration,
        tags: ['test']
      };

      templateEngine.registerTemplate(newTemplate);
      const retrieved = templateEngine.getTemplate('test-template');
      expect(retrieved).toEqual(newTemplate);
    });
  });

  describe('Component Management', () => {
    it('should have default components loaded', () => {
      const components = templateEngine.getAllComponents();
      expect(components.length).toBeGreaterThan(0);
      
      const heroComponent = components.find(c => c.id === 'hero');
      expect(heroComponent).toBeDefined();
      expect(heroComponent?.category).toBe('Layout');
    });

    it('should get component by ID', () => {
      const component = templateEngine.getComponent('hero');
      expect(component).toBeDefined();
      expect(component?.id).toBe('hero');
    });

    it('should filter components by category', () => {
      const layoutComponents = templateEngine.getComponentsByCategory('Layout');
      expect(layoutComponents.length).toBeGreaterThan(0);
      layoutComponents.forEach(component => {
        expect(component.category).toBe('Layout');
      });
    });
  });

  describe('HTML Generation', () => {
    let testConfig: PageConfiguration;

    beforeEach(() => {
      testConfig = {
        pageSettings: {
          pageName: 'Test Page',
          publishedURL: 'https://example.com/test',
          pageType: 'landing',
          title: 'Test Page Title',
          description: 'Test page description'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
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
    });

    it('should generate basic HTML structure', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('should include page title in head', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('<title>Test Page Title</title>');
    });

    it('should include meta description when provided', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('<meta name="description" content="Test page description">');
    });

    it('should include Bootstrap CSS for Bootstrap framework', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('bootstrap');
    });

    it('should include Tailwind script for Tailwind framework', () => {
      testConfig.codeResources.css.framework = 'tailwind';
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('tailwindcss.com');
    });

    it('should include accessibility attributes when enabled', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('role="document"');
    });

    it('should not include accessibility attributes when disabled', () => {
      testConfig.advancedOptions.accessibility = false;
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).not.toContain('role="document"');
    });

    it('should include header when enabled', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('<header');
    });

    it('should include footer when enabled', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('<footer');
    });

    it('should include custom CSS when provided', () => {
      testConfig.codeResources.css.customCSS = '.custom { color: red; }';
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('.custom { color: red; }');
    });

    it('should include external stylesheets when provided', () => {
      testConfig.codeResources.css.externalStylesheets = ['https://example.com/style.css'];
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('href="https://example.com/style.css"');
    });

    it('should include custom JavaScript when provided', () => {
      testConfig.codeResources.javascript.customJS = 'console.log("test");';
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('console.log("test");');
    });

    it('should include external scripts when provided', () => {
      testConfig.codeResources.javascript.externalScripts = ['https://example.com/script.js'];
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('src="https://example.com/script.js"');
    });
  });

  describe('Component Rendering', () => {
    let testConfig: PageConfiguration;

    beforeEach(() => {
      testConfig = {
        pageSettings: {
          pageName: 'Test Page',
          publishedURL: 'https://example.com/test',
          pageType: 'landing',
          title: 'Test Page Title'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
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
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            position: 1,
            props: {
              title: 'Welcome Hero',
              subtitle: 'Hero subtitle',
              ctaText: 'Click Me',
              ctaUrl: '/action'
            },
            content: 'Hero content',
            ampscript: 'SET @heroVar = "test"'
          }
        ]
      };
    });

    it('should render components with props', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('Welcome Hero');
      expect(html).toContain('Hero subtitle');
      expect(html).toContain('Click Me');
      expect(html).toContain('/action');
    });

    it('should include AMPScript when enabled', () => {
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).toContain('SET @heroVar = "test"');
    });

    it('should not include AMPScript when disabled', () => {
      testConfig.advancedOptions.ampscriptEnabled = false;
      const html = templateEngine.generateBaseStructure(testConfig);
      expect(html).not.toContain('SET @heroVar = "test"');
    });

    it('should render components in correct order', () => {
      testConfig.components = [
        {
          id: 'component-2',
          type: 'content',
          position: 2,
          props: { content: 'Second component' }
        },
        {
          id: 'component-1',
          type: 'content',
          position: 1,
          props: { content: 'First component' }
        }
      ];

      const html = templateEngine.generateBaseStructure(testConfig);
      const firstIndex = html.indexOf('First component');
      const secondIndex = html.indexOf('Second component');
      expect(firstIndex).toBeLessThan(secondIndex);
    });
  });
});