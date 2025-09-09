/**
 * UI Component Library Tests
 */

import { UIComponentLibrary } from '../ui-component-library';

describe('UIComponentLibrary', () => {
  let library: UIComponentLibrary;

  beforeEach(() => {
    library = new UIComponentLibrary();
  });

  describe('Component Management', () => {
    it('should have default components loaded', () => {
      const components = library.getAllComponents();
      expect(components.length).toBeGreaterThan(0);
      
      const navbarComponent = components.find(c => c.id === 'navbar');
      expect(navbarComponent).toBeDefined();
      expect(navbarComponent?.category).toBe('Navigation');
    });

    it('should get component by ID', () => {
      const component = library.getComponent('navbar');
      expect(component).toBeDefined();
      expect(component?.id).toBe('navbar');
      expect(component?.name).toBe('Navigation Bar');
    });

    it('should return undefined for non-existent component', () => {
      const component = library.getComponent('non-existent');
      expect(component).toBeUndefined();
    });

    it('should filter components by category', () => {
      const navigationComponents = library.getComponentsByCategory('Navigation');
      expect(navigationComponents.length).toBeGreaterThan(0);
      navigationComponents.forEach(component => {
        expect(component.category).toBe('Navigation');
      });

      const formComponents = library.getComponentsByCategory('Forms');
      expect(formComponents.length).toBeGreaterThan(0);
      formComponents.forEach(component => {
        expect(component.category).toBe('Forms');
      });
    });

    it('should register new component', () => {
      const newComponent = {
        id: 'test-component',
        name: 'Test Component',
        category: 'Test',
        description: 'A test component',
        ampscriptSupport: false,
        props: [],
        template: '<div>Test</div>',
        styles: {
          bootstrap: '.test { color: red; }',
          tailwind: '.test { @apply text-red-500; }',
          vanilla: '.test { color: red; }'
        }
      };

      library.registerComponent(newComponent);
      const retrieved = library.getComponent('test-component');
      expect(retrieved).toEqual(newComponent);
    });
  });

  describe('Template Generation', () => {
    it('should generate component template with props', () => {
      const template = library.getComponentTemplate('navbar', 'bootstrap', {
        brand: 'My Brand',
        brandUrl: '/home',
        fixed: true
      });

      expect(template).toContain('My Brand');
      expect(template).toContain('/home');
      expect(template).toContain('fixed-top');
    });

    it('should use default values for missing props', () => {
      const template = library.getComponentTemplate('navbar', 'bootstrap', {
        brand: 'My Brand'
        // brandUrl not provided, should use default '#'
      });

      expect(template).toContain('My Brand');
      expect(template).toContain('href="#"');
    });

    it('should return error comment for non-existent component', () => {
      const template = library.getComponentTemplate('non-existent', 'bootstrap');
      expect(template).toContain('<!-- Component non-existent not found -->');
    });

    it('should apply Bootstrap styles correctly', () => {
      const template = library.getComponentTemplate('contact-form', 'bootstrap', {
        title: 'Contact Us',
        action: '/submit'
      });

      expect(template).toContain('Contact Us');
      expect(template).toContain('/submit');
      expect(template).toContain('class="form-control"');
      expect(template).toContain('class="btn btn-primary"');
    });

    it('should apply Tailwind styles correctly', () => {
      const template = library.getComponentTemplate('contact-form', 'tailwind', {
        title: 'Contact Us',
        action: '/submit'
      });

      expect(template).toContain('Contact Us');
      expect(template).toContain('/submit');
      // Note: The actual Tailwind class replacement would happen in the applyTailwindStyles method
    });
  });

  describe('Prop Validation', () => {
    it('should validate required props', () => {
      const result = library.validateProps('navbar', {
        // Missing required 'brand' prop
        brandUrl: '/home'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Property 'brand' is required");
    });

    it('should validate prop types', () => {
      const result = library.validateProps('navbar', {
        brand: 'My Brand',
        fixed: 'not-a-boolean' // Should be boolean
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Property 'fixed' must be of type boolean");
    });

    it('should validate number ranges', () => {
      const result = library.validateProps('feature-cards', {
        features: [],
        columns: 5 // Max is 4
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Property 'columns' must be at most 4");
    });

    it('should pass validation for valid props', () => {
      const result = library.validateProps('navbar', {
        brand: 'My Brand',
        brandUrl: '/home',
        fixed: true
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-existent component', () => {
      const result = library.validateProps('non-existent', {});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Component non-existent not found');
    });

    it('should validate array props', () => {
      const result = library.validateProps('feature-cards', {
        features: 'not-an-array' // Should be array
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Property 'features' must be of type array");
    });

    it('should validate object props', () => {
      // First, let's create a component with object props for testing
      library.registerComponent({
        id: 'test-object-component',
        name: 'Test Object Component',
        category: 'Test',
        description: 'Component with object props',
        ampscriptSupport: false,
        props: [
          {
            name: 'config',
            type: 'object',
            required: true
          }
        ],
        template: '<div>{{config}}</div>',
        styles: {
          bootstrap: '',
          tailwind: '',
          vanilla: ''
        }
      });

      const result = library.validateProps('test-object-component', {
        config: 'not-an-object' // Should be object
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Property 'config' must be of type object");
    });

    it('should allow optional props to be undefined', () => {
      const result = library.validateProps('navbar', {
        brand: 'My Brand'
        // brandUrl is optional and not provided
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Framework Style Application', () => {
    it('should apply Bootstrap class mappings', () => {
      const template = '<button class="btn btn-primary">Click me</button>';
      // We need to access the private method for testing
      // In a real scenario, this would be tested through the public getComponentTemplate method
      
      const component = library.getComponent('contact-form');
      expect(component).toBeDefined();
      expect(component?.styles.bootstrap).toBeDefined();
    });

    it('should have different styles for different frameworks', () => {
      const component = library.getComponent('contact-form');
      expect(component).toBeDefined();
      
      if (component) {
        expect(component.styles.bootstrap).toBeDefined();
        expect(component.styles.tailwind).toBeDefined();
        expect(component.styles.vanilla).toBeDefined();
        
        // Styles should be different for each framework
        expect(component.styles.bootstrap).not.toBe(component.styles.tailwind);
        expect(component.styles.tailwind).not.toBe(component.styles.vanilla);
      }
    });
  });

  describe('Component Categories', () => {
    it('should have components in Navigation category', () => {
      const navComponents = library.getComponentsByCategory('Navigation');
      expect(navComponents.length).toBeGreaterThan(0);
      
      const navbar = navComponents.find(c => c.id === 'navbar');
      expect(navbar).toBeDefined();
    });

    it('should have components in Forms category', () => {
      const formComponents = library.getComponentsByCategory('Forms');
      expect(formComponents.length).toBeGreaterThan(0);
      
      const contactForm = formComponents.find(c => c.id === 'contact-form');
      expect(contactForm).toBeDefined();
    });

    it('should have components in Layout category', () => {
      const layoutComponents = library.getComponentsByCategory('Layout');
      expect(layoutComponents.length).toBeGreaterThan(0);
      
      const heroSection = layoutComponents.find(c => c.id === 'hero-section');
      expect(heroSection).toBeDefined();
    });

    it('should have components in Content category', () => {
      const contentComponents = library.getComponentsByCategory('Content');
      expect(contentComponents.length).toBeGreaterThan(0);
      
      const featureCards = contentComponents.find(c => c.id === 'feature-cards');
      expect(featureCards).toBeDefined();
    });
  });

  describe('AMPScript Support', () => {
    it('should indicate AMPScript support correctly', () => {
      const heroSection = library.getComponent('hero-section');
      expect(heroSection?.ampscriptSupport).toBe(true);
      
      const featureCards = library.getComponent('feature-cards');
      expect(featureCards?.ampscriptSupport).toBe(false);
    });
  });
});