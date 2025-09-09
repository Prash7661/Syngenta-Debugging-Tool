/**
 * Responsive Generator Tests
 */

import { ResponsiveGenerator } from '../responsive-generator';
import { PageConfiguration, Framework } from '../../../types/cloud-pages';

describe('ResponsiveGenerator', () => {
  let responsiveGenerator: ResponsiveGenerator;
  let mockConfig: PageConfiguration;

  beforeEach(() => {
    responsiveGenerator = new ResponsiveGenerator();
    
    mockConfig = {
      pageSettings: {
        pageName: 'test-page',
        publishedURL: 'test.com/page',
        pageType: 'landing',
        title: 'Test Page'
      },
      codeResources: {
        css: {
          framework: 'bootstrap'
        },
        javascript: {}
      },
      advancedOptions: {
        responsive: true,
        mobileFirst: true,
        accessibility: false,
        seoOptimized: false,
        ampscriptEnabled: false
      },
      layout: {
        structure: 'single-column',
        header: true,
        footer: true
      },
      components: [
        {
          id: 'hero-1',
          type: 'hero',
          position: 1,
          props: {},
          styling: {
            responsive: {
              mobile: 'font-size: 1.5rem;',
              tablet: 'font-size: 2rem;',
              desktop: 'font-size: 2.5rem;'
            }
          }
        }
      ]
    };
  });

  describe('generateResponsiveCSS', () => {
    it('should generate mobile-first responsive CSS', () => {
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('/* Mobile Base Styles (Mobile-First) */');
      expect(css).toContain('/* Tablet Styles */');
      expect(css).toContain('/* Desktop Styles */');
      expect(css).toContain('@media (min-width: 768px)');
      expect(css).toContain('@media (min-width: 1024px)');
    });

    it('should generate Bootstrap-specific responsive styles', () => {
      mockConfig.codeResources.css.framework = 'bootstrap';
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('.container-fluid');
      expect(css).toContain('.navbar-toggler');
      expect(css).toContain('.btn { width: 100%');
    });

    it('should generate Tailwind-specific responsive styles', () => {
      mockConfig.codeResources.css.framework = 'tailwind';
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('.container { padding: 0 1rem');
      expect(css).toContain('.grid { grid-template-columns: 1fr');
      expect(css).toContain('.nav-toggle { display: block');
    });

    it('should generate Vanilla CSS responsive styles', () => {
      mockConfig.codeResources.css.framework = 'vanilla';
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('.container { padding: 0 20px');
      expect(css).toContain('.grid { display: grid');
      expect(css).toContain('.features-grid { display: grid');
    });

    it('should include component-specific responsive styles', () => {
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('/* Mobile styles for hero-1 */');
      expect(css).toContain('font-size: 1.5rem;');
      expect(css).toContain('/* Tablet styles for hero-1 */');
      expect(css).toContain('font-size: 2rem;');
      expect(css).toContain('/* Desktop styles for hero-1 */');
      expect(css).toContain('font-size: 2.5rem;');
    });
  });

  describe('generateFrameworkResponsiveUtils', () => {
    it('should generate Bootstrap responsive utilities', () => {
      const utils = responsiveGenerator.generateFrameworkResponsiveUtils('bootstrap');
      
      expect(utils).toContain('/* Bootstrap Responsive Utilities */');
      expect(utils).toContain('.d-block');
      expect(utils).toContain('.d-none');
      expect(utils).toContain('.d-sm-none');
      expect(utils).toContain('.d-md-block');
    });

    it('should generate Tailwind responsive utilities', () => {
      const utils = responsiveGenerator.generateFrameworkResponsiveUtils('tailwind');
      
      expect(utils).toContain('/* Tailwind Responsive Utilities */');
      expect(utils).toContain('.block');
      expect(utils).toContain('.hidden');
      expect(utils).toContain('.md\\:block');
      expect(utils).toContain('.lg\\:flex');
    });

    it('should generate Vanilla CSS responsive utilities', () => {
      const utils = responsiveGenerator.generateFrameworkResponsiveUtils('vanilla');
      
      expect(utils).toContain('/* Vanilla CSS Responsive Utilities */');
      expect(utils).toContain('.show');
      expect(utils).toContain('.hide');
      expect(utils).toContain('.mobile-hide');
      expect(utils).toContain('.desktop-show');
    });
  });

  describe('generateResponsiveNavJS', () => {
    it('should generate responsive navigation JavaScript', () => {
      const js = responsiveGenerator.generateResponsiveNavJS();
      
      expect(js).toContain('/* Responsive Navigation JavaScript */');
      expect(js).toContain('nav-toggle');
      expect(js).toContain('nav-menu');
      expect(js).toContain('addEventListener');
      expect(js).toContain('classList.toggle');
      expect(js).toContain('window.innerWidth >= 768');
    });
  });

  describe('generateResponsiveImageCSS', () => {
    it('should generate responsive image CSS', () => {
      const css = responsiveGenerator.generateResponsiveImageCSS();
      
      expect(css).toContain('/* Responsive Images */');
      expect(css).toContain('img { max-width: 100%');
      expect(css).toContain('.responsive-img');
      expect(css).toContain('picture');
      expect(css).toContain('.video-responsive');
      expect(css).toContain('padding-bottom: 56.25%');
    });
  });

  describe('edge cases', () => {
    it('should handle empty components array', () => {
      mockConfig.components = [];
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('/* Mobile Base Styles');
      expect(css).not.toContain('/* Mobile styles for');
    });

    it('should handle components without responsive styling', () => {
      mockConfig.components[0].styling = {};
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('/* Mobile Base Styles');
      expect(css).not.toContain('/* Mobile styles for hero-1');
    });

    it('should handle unknown framework', () => {
      mockConfig.codeResources.css.framework = 'unknown' as Framework;
      const css = responsiveGenerator.generateResponsiveCSS(mockConfig);
      
      expect(css).toContain('/* Mobile Base Styles');
      expect(css).toContain('/* Tablet Styles */');
    });
  });
});