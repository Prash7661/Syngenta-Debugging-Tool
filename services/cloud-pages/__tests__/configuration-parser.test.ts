/**
 * Configuration Parser Tests
 */

import { ConfigurationParser } from '../configuration-parser';
import { PageConfiguration } from '../../../types/cloud-pages';

describe('ConfigurationParser', () => {
  let parser: ConfigurationParser;

  beforeEach(() => {
    parser = new ConfigurationParser();
  });

  describe('parseJSON', () => {
    it('should parse valid JSON configuration', () => {
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

      const result = parser.parseJSON(jsonConfig);
      expect(result.pageSettings.pageName).toBe('Test Page');
      expect(result.pageSettings.pageType).toBe('landing');
      expect(result.codeResources.css.framework).toBe('bootstrap');
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      expect(() => parser.parseJSON(invalidJson)).toThrow('Invalid JSON format');
    });

    it('should throw error for invalid configuration structure', () => {
      const invalidConfig = JSON.stringify({ invalid: 'config' });
      expect(() => parser.parseJSON(invalidConfig)).toThrow();
    });
  });

  describe('parseYAML', () => {
    it('should parse valid YAML configuration', () => {
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

      const result = parser.parseYAML(yamlConfig);
      expect(result.pageSettings.pageName).toBe('Test Page');
      expect(result.pageSettings.pageType).toBe('landing');
      expect(result.codeResources.css.framework).toBe('bootstrap');
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = `
invalid:
  - yaml
    - structure
`;
      expect(() => parser.parseYAML(invalidYaml)).toThrow('Invalid YAML format');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
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

      const result = parser.validateConfiguration(validConfig);
      expect(result.pageSettings.pageName).toBe('Test Page');
    });

    it('should throw error for missing required fields', () => {
      const invalidConfig = {
        pageSettings: {
          // Missing required fields
        }
      };

      expect(() => parser.validateConfiguration(invalidConfig)).toThrow('Configuration validation failed');
    });

    it('should throw error for invalid page type', () => {
      const invalidConfig = {
        pageSettings: {
          pageName: 'Test',
          pageType: 'invalid-type',
          title: 'Test'
        },
        codeResources: {
          css: { framework: 'bootstrap' },
          javascript: {}
        },
        layout: { structure: 'single-column' },
        components: []
      };

      expect(() => parser.validateConfiguration(invalidConfig)).toThrow();
    });
  });

  describe('validateWithDetails', () => {
    it('should return validation success for valid config', () => {
      const validConfig = {
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

      const result = parser.validateWithDetails(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid config', () => {
      const invalidConfig = {
        pageSettings: {
          pageName: '', // Invalid: empty string
          pageType: 'invalid', // Invalid: not in enum
          title: 'Test'
        }
      };

      const result = parser.validateWithDetails(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should generate warnings for potential issues', () => {
      const configWithWarnings = {
        pageSettings: {
          pageName: 'Test Page',
          pageType: 'landing',
          title: 'Test Title'
        },
        codeResources: {
          css: { 
            framework: 'bootstrap',
            externalStylesheets: ['url1', 'url2', 'url3', 'url4'] // Too many stylesheets
          },
          javascript: {}
        },
        advancedOptions: {
          accessibility: false // Accessibility disabled
        },
        layout: { structure: 'single-column' },
        components: []
      };

      const result = parser.validateWithDetails(configWithWarnings);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('generateDefaultConfiguration', () => {
    it('should generate valid default configuration', () => {
      const defaultConfig = parser.generateDefaultConfiguration();
      
      expect(defaultConfig.pageSettings.pageName).toBe('New Cloud Page');
      expect(defaultConfig.pageSettings.pageType).toBe('landing');
      expect(defaultConfig.codeResources.css.framework).toBe('bootstrap');
      expect(defaultConfig.advancedOptions.responsive).toBe(true);
      expect(defaultConfig.layout.structure).toBe('single-column');
      expect(defaultConfig.components).toEqual([]);

      // Validate that the default config is actually valid
      const validationResult = parser.validateWithDetails(defaultConfig);
      expect(validationResult.isValid).toBe(true);
    });
  });
});