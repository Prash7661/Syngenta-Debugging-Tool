/**
 * Cloud Pages Service Tests
 */

import { CloudPagesService } from '../cloud-pages.service';
import { PageConfiguration } from '../../../types/cloud-pages';

describe('CloudPagesService', () => {
  let service: CloudPagesService;

  beforeEach(() => {
    service = new CloudPagesService();
  });

  describe('Configuration Generation', () => {
    it('should generate from valid JSON configuration', async () => {
      const jsonConfig = JSON.stringify({
        pageSettings: {
          pageName: 'Test Page',
          publishedURL: 'https://example.com/test',
          pageType: 'landing',
          title: 'Test Title'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {},
        layout: { structure: 'single-column' },
        components: []
      });

      const result = await service.generateFromJSON(jsonConfig);
      
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].html).toContain('Test Title');
      expect(result.pages[0].metadata.pageName).toBe('Test Page');
      expect(result.pages[0].metadata.framework).toBe('bootstrap');
      expect(result.codeResources.length).toBeGreaterThan(0);
    });

    it('should generate from valid YAML configuration', async () => {
      const yamlConfig = `
pageSettings:
  pageName: Test Page
  publishedURL: https://example.com/test
  pageType: landing
  title: Test Title
codeResources:
  css:
    framework: bootstrap
  javascript: {}
advancedOptions: {}
layout:
  structure: single-column
components: []
`;

      const result = await service.generateFromYAML(yamlConfig);
      
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].html).toContain('Test Title');
      expect(result.pages[0].metadata.pageName).toBe('Test Page');
    });

    it('should generate from configuration object', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'Test Page',
          publishedURL: 'https://example.com/test',
          pageType: 'landing',
          title: 'Test Title'
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
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = await service.generateFromConfig(config);
      
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].html).toContain('Test Title');
      expect(result.pages[0].metadata.pageName).toBe('Test Page');
    });

    it('should throw error for invalid JSON', async () => {
      const invalidJson = '{ invalid json }';
      
      await expect(service.generateFromJSON(invalidJson)).rejects.toThrow();
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = {
        pageSettings: {
          // Missing required fields
        }
      } as PageConfiguration;

      await expect(service.generateFromConfig(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Template Generation', () => {
    it('should generate from existing template', async () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      
      const bootstrapTemplate = templates.find(t => t.id === 'bootstrap-landing');
      expect(bootstrapTemplate).toBeDefined();

      const result = await service.generateFromTemplate('bootstrap-landing');
      
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].metadata.framework).toBe('bootstrap');
    });

    it('should generate from template with customizations', async () => {
      const customizations = {
        pageSettings: {
          pageName: 'Custom Page',
          title: 'Custom Title'
        }
      };

      const result = await service.generateFromTemplate('bootstrap-landing', customizations);
      
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].html).toContain('Custom Title');
      expect(result.pages[0].metadata.pageName).toBe('Custom Page');
    });

    it('should throw error for non-existent template', async () => {
      await expect(service.generateFromTemplate('non-existent')).rejects.toThrow('Template non-existent not found');
    });
  });

  describe('Validation', () => {
    it('should validate correct configuration', () => {
      const validConfig: PageConfiguration = {
        pageSettings: {
          pageName: 'Test Page',
          publishedURL: 'https://example.com/test',
          pageType: 'landing',
          title: 'Test Title'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {},
        layout: { structure: 'single-column' },
        components: []
      };

      const result = service.validateConfiguration(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid configuration', () => {
      const invalidConfig = {
        pageSettings: {
          pageName: '', // Invalid: empty string
          pageType: 'invalid' // Invalid: not in enum
        }
      } as PageConfiguration;

      const result = service.validateConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Template and Component Access', () => {
    it('should get all templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('framework');
    });

    it('should get templates by type', () => {
      const landingTemplates = service.getTemplatesByType('landing');
      expect(landingTemplates.length).toBeGreaterThan(0);
      landingTemplates.forEach(template => {
        expect(template.pageType).toBe('landing');
      });
    });

    it('should get all components', () => {
      const components = service.getComponents();
      expect(components.length).toBeGreaterThan(0);
      expect(components[0]).toHaveProperty('id');
      expect(components[0]).toHaveProperty('name');
      expect(components[0]).toHaveProperty('category');
    });

    it('should get components by category', () => {
      const formComponents = service.getComponentsByCategory('Forms');
      expect(formComponents.length).toBeGreaterThan(0);
      formComponents.forEach(component => {
        expect(component.category).toBe('Forms');
      });
    });

    it('should get default configuration', () => {
      const defaultConfig = service.getDefaultConfiguration();
      expect(defaultConfig.pageSettings.pageName).toBe('New Cloud Page');
      expect(defaultConfig.pageSettings.pageType).toBe('landing');
      expect(defaultConfig.codeResources.css.framework).toBe('bootstrap');
    });
  });

  describe('Generated Output Structure', () => {
    let testConfig: PageConfiguration;

    beforeEach(() => {
      testConfig = {
        pageSettings: {
          pageName: 'Test Page',
          publishedURL: 'https://example.com/test',
          pageType: 'landing',
          title: 'Test Title',
          description: 'Test description'
        },
        codeResources: {
          css: { 
            framework: 'bootstrap',
            customCSS: '.custom { color: red; }'
          },
          javascript: {
            customJS: 'console.log("test");'
          }
        },
        advancedOptions: {
          responsive: true,
          mobileFirst: true,
          accessibility: true,
          seoOptimized: true,
          ampscriptEnabled: true
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            position: 1,
            props: { title: 'Hero Title' },
            ampscript: 'SET @test = "value"'
          }
        ]
      };
    });

    it('should generate complete output structure', async () => {
      const result = await service.generateFromConfig(testConfig);
      
      expect(result).toHaveProperty('pages');
      expect(result).toHaveProperty('codeResources');
      expect(result).toHaveProperty('integrationNotes');
      expect(result).toHaveProperty('testingGuidelines');
      expect(result).toHaveProperty('deploymentInstructions');
    });

    it('should generate HTML with proper structure', async () => {
      const result = await service.generateFromConfig(testConfig);
      const html = result.pages[0].html;
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en"');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('Test Title');
      expect(html).toContain('Hero Title');
    });

    it('should generate CSS with custom styles', async () => {
      const result = await service.generateFromConfig(testConfig);
      const css = result.pages[0].css;
      
      expect(css).toContain('.custom { color: red; }');
      expect(css).toContain('Bootstrap Base Styles');
    });

    it('should generate JavaScript when provided', async () => {
      const result = await service.generateFromConfig(testConfig);
      const javascript = result.pages[0].javascript;
      
      expect(javascript).toContain('console.log("test");');
    });

    it('should generate AMPScript when enabled', async () => {
      const result = await service.generateFromConfig(testConfig);
      const ampscript = result.pages[0].ampscript;
      
      expect(ampscript).toContain('SET @test = "value"');
    });

    it('should not generate AMPScript when disabled', async () => {
      testConfig.advancedOptions.ampscriptEnabled = false;
      const result = await service.generateFromConfig(testConfig);
      const ampscript = result.pages[0].ampscript;
      
      expect(ampscript).toBeUndefined();
    });

    it('should generate code resources', async () => {
      const result = await service.generateFromConfig(testConfig);
      
      expect(result.codeResources.length).toBeGreaterThan(0);
      
      const cssResource = result.codeResources.find(r => r.type === 'css');
      expect(cssResource).toBeDefined();
      expect(cssResource?.name).toContain('Test Page');
      
      const jsResource = result.codeResources.find(r => r.type === 'javascript');
      expect(jsResource).toBeDefined();
      
      const ampscriptResource = result.codeResources.find(r => r.type === 'ampscript');
      expect(ampscriptResource).toBeDefined();
    });

    it('should calculate performance metrics', async () => {
      const result = await service.generateFromConfig(testConfig);
      const performance = result.pages[0].metadata.performance;
      
      expect(performance).toHaveProperty('estimatedLoadTime');
      expect(performance).toHaveProperty('cssSize');
      expect(performance).toHaveProperty('jsSize');
      expect(performance).toHaveProperty('htmlSize');
      expect(performance).toHaveProperty('optimizationScore');
      
      expect(performance.estimatedLoadTime).toBeGreaterThan(0);
      expect(performance.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(performance.optimizationScore).toBeLessThanOrEqual(100);
    });

    it('should generate documentation', async () => {
      const result = await service.generateFromConfig(testConfig);
      
      expect(result.integrationNotes).toContain('Integration Notes for Test Page');
      expect(result.integrationNotes).toContain('Framework: bootstrap');
      
      expect(result.testingGuidelines).toContain('Testing Guidelines for Test Page');
      expect(result.testingGuidelines).toContain('Browser Testing');
      
      expect(result.deploymentInstructions).toContain('Deployment Instructions for Test Page');
      expect(result.deploymentInstructions).toContain('Step 1: Create Cloud Page');
    });
  });

  describe('Framework-Specific Generation', () => {
    it('should generate Bootstrap-specific code', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'Bootstrap Page',
          publishedURL: 'test.com/bootstrap',
          pageType: 'landing',
          title: 'Bootstrap Test'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {
          responsive: false,
          mobileFirst: false,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: false
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = await service.generateFromConfig(config);
      
      expect(result.pages[0].html).toContain('bootstrap');
      expect(result.pages[0].css).toContain('Bootstrap Base Styles');
    });

    it('should generate Tailwind-specific code', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'Tailwind Page',
          publishedURL: 'test.com/tailwind',
          pageType: 'landing',
          title: 'Tailwind Test'
        },
        codeResources: {
          css: { framework: 'tailwind' },
          javascript: {}
        },
        advancedOptions: {
          responsive: false,
          mobileFirst: false,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: false
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = await service.generateFromConfig(config);
      
      expect(result.pages[0].html).toContain('tailwindcss.com');
      expect(result.pages[0].css).toContain('Tailwind Base Styles');
    });

    it('should generate Vanilla CSS code', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'Vanilla Page',
          publishedURL: 'test.com/vanilla',
          pageType: 'landing',
          title: 'Vanilla Test'
        },
        codeResources: {
          css: { framework: 'vanilla' },
          javascript: {}
        },
        advancedOptions: {
          responsive: false,
          mobileFirst: false,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: false
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = await service.generateFromConfig(config);
      
      expect(result.pages[0].css).toContain('Vanilla CSS Base Styles');
    });
  });

  describe('Mobile-First Responsive Generation', () => {
    it('should generate mobile-first responsive CSS', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'Responsive Page',
          publishedURL: 'test.com/responsive',
          pageType: 'landing',
          title: 'Responsive Test'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {
          responsive: true,
          mobileFirst: true,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: false
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = await service.generateMobileFirstPage(config);
      
      expect(result.pages[0].css).toContain('/* Mobile Base Styles (Mobile-First) */');
      expect(result.pages[0].css).toContain('@media (min-width: 768px)');
      expect(result.pages[0].css).toContain('/* Responsive Images */');
      expect(result.pages[0].javascript).toContain('nav-toggle');
    });

    it('should generate framework-specific responsive utilities', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'Bootstrap Responsive',
          publishedURL: 'test.com/bootstrap-responsive',
          pageType: 'landing',
          title: 'Bootstrap Responsive'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {
          responsive: true,
          mobileFirst: true,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: false
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = await service.generateFrameworkSpecificPage(config, 'bootstrap');
      
      expect(result.pages[0].css).toContain('/* Bootstrap Responsive Utilities */');
      expect(result.pages[0].css).toContain('.d-block');
      expect(result.pages[0].css).toContain('.d-sm-none');
    });

    it('should validate responsive configuration', () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'Test Page',
          publishedURL: 'test.com/test',
          pageType: 'landing',
          title: 'Test'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {
          responsive: false,
          mobileFirst: true, // Invalid: mobile-first without responsive
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: false
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = service.validateResponsiveConfig(config);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MOBILE_FIRST_REQUIRES_RESPONSIVE');
    });
  });

  describe('AMPScript Integration', () => {
    it('should generate AMPScript when enabled', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'AMPScript Page',
          publishedURL: 'test.com/ampscript',
          pageType: 'form',
          title: 'AMPScript Test'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {
          responsive: false,
          mobileFirst: false,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: true,
          dataExtensionIntegration: ['Subscribers', 'Preferences']
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: [
          {
            id: 'contact-form',
            type: 'form',
            position: 1,
            props: {
              fields: [
                { name: 'firstName', label: 'First Name', type: 'text', required: true }
              ]
            }
          }
        ]
      };

      const result = await service.generatePageWithAMPScript(config, {
        dataExtensions: ['Subscribers', 'Preferences']
      });
      
      expect(result.pages[0].ampscript).toBeDefined();
      expect(result.pages[0].ampscript).toContain('VAR @subscriberKey');
      expect(result.pages[0].ampscript).toContain('LookupRows("Subscribers"');
      expect(result.pages[0].ampscript).toContain('Form Handling Logic');
    });

    it('should not generate AMPScript when disabled', async () => {
      const config: PageConfiguration = {
        pageSettings: {
          pageName: 'No AMPScript Page',
          publishedURL: 'test.com/no-ampscript',
          pageType: 'landing',
          title: 'No AMPScript'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        advancedOptions: {
          responsive: false,
          mobileFirst: false,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: false
        },
        layout: { structure: 'single-column', header: true, footer: true },
        components: []
      };

      const result = await service.generateFromConfig(config);
      
      expect(result.pages[0].ampscript).toBeUndefined();
    });

    it('should get responsive breakpoints for different frameworks', () => {
      const bootstrapBreakpoints = service.getResponsiveBreakpoints('bootstrap');
      expect(bootstrapBreakpoints).toEqual({ mobile: 576, tablet: 768, desktop: 992 });

      const tailwindBreakpoints = service.getResponsiveBreakpoints('tailwind');
      expect(tailwindBreakpoints).toEqual({ mobile: 640, tablet: 768, desktop: 1024 });

      const vanillaBreakpoints = service.getResponsiveBreakpoints('vanilla');
      expect(vanillaBreakpoints).toEqual({ mobile: 480, tablet: 768, desktop: 1024 });
    });
  });
});