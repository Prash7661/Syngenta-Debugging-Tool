/**
 * AMPScript Integration Tests
 */

import { AMPScriptIntegration } from '../ampscript-integration';
import { PageConfiguration } from '../../../types/cloud-pages';

describe('AMPScriptIntegration', () => {
  let ampscriptIntegration: AMPScriptIntegration;
  let mockConfig: PageConfiguration;

  beforeEach(() => {
    ampscriptIntegration = new AMPScriptIntegration();
    
    mockConfig = {
      pageSettings: {
        pageName: 'test-page',
        publishedURL: 'test.com/page',
        pageType: 'form',
        title: 'Test Form Page',
        description: 'A test form page'
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
        ampscriptEnabled: true,
        dataExtensionIntegration: ['Subscribers', 'Preferences']
      },
      layout: {
        structure: 'single-column',
        header: true,
        footer: true
      },
      components: [
        {
          id: 'contact-form',
          type: 'form',
          position: 1,
          props: {
            fields: [
              { name: 'firstName', label: 'First Name', type: 'text', required: true },
              { name: 'lastName', label: 'Last Name', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true }
            ]
          },
          ampscript: '/* Custom component AMPScript */'
        }
      ]
    };
  });

  describe('generateAMPScript', () => {
    it('should generate complete AMPScript blocks', () => {
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      
      expect(blocks).toHaveLength(6); // header, component, form, data extension, personalization, tracking
      expect(blocks[0].type).toBe('header');
      expect(blocks[0].description).toContain('Header AMPScript');
    });

    it('should generate header AMPScript with variable declarations', () => {
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      const headerBlock = blocks.find(b => b.type === 'header');
      
      expect(headerBlock).toBeDefined();
      expect(headerBlock!.content).toContain('VAR @subscriberKey');
      expect(headerBlock!.content).toContain('VAR @emailAddress');
      expect(headerBlock!.content).toContain('VAR @firstName');
      expect(headerBlock!.content).toContain('SET @pageTitle = "Test Form Page"');
      expect(headerBlock!.content).toContain('VAR @SubscribersRows');
      expect(headerBlock!.content).toContain('VAR @PreferencesRows');
    });

    it('should generate form handling AMPScript', () => {
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      const formBlock = blocks.find(b => b.description.includes('Form handling'));
      
      expect(formBlock).toBeDefined();
      expect(formBlock!.content).toContain('Form Handling Logic');
      expect(formBlock!.content).toContain('VAR @firstName');
      expect(formBlock!.content).toContain('VAR @lastName');
      expect(formBlock!.content).toContain('VAR @email');
      expect(formBlock!.content).toContain('RequestParameter("firstName")');
      expect(formBlock!.content).toContain('ValidateEmail(@email)');
      expect(formBlock!.content).toContain('InsertData("Subscribers"');
    });

    it('should generate data extension integration AMPScript', () => {
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      const dataBlock = blocks.find(b => b.description.includes('Data extension'));
      
      expect(dataBlock).toBeDefined();
      expect(dataBlock!.content).toContain('LookupRows("Subscribers"');
      expect(dataBlock!.content).toContain('LookupRows("Preferences"');
      expect(dataBlock!.content).toContain('RowCount(@SubscribersRows)');
    });

    it('should generate personalization AMPScript', () => {
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      const personalizationBlock = blocks.find(b => b.description.includes('Personalization'));
      
      expect(personalizationBlock).toBeDefined();
      expect(personalizationBlock!.content).toContain('AttributeValue("FirstName")');
      expect(personalizationBlock!.content).toContain('Valued Customer');
      expect(personalizationBlock!.content).toContain('Good morning');
      expect(personalizationBlock!.content).toContain('DatePart(@currentDate, "H")');
    });

    it('should generate tracking AMPScript', () => {
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      const trackingBlock = blocks.find(b => b.description.includes('tracking'));
      
      expect(trackingBlock).toBeDefined();
      expect(trackingBlock!.content).toContain('InsertData("PageViews"');
      expect(trackingBlock!.content).toContain('RequestParameter("utm_source")');
      expect(trackingBlock!.content).toContain('UTMTracking');
    });
  });

  describe('generateDynamicContentAMPScript', () => {
    it('should generate conditional content AMPScript', () => {
      const ampscript = ampscriptIntegration.generateDynamicContentAMPScript('conditional-content', {});
      
      expect(ampscript).toContain('Conditional Content Display');
      expect(ampscript).toContain('AttributeValue("Segment")');
      expect(ampscript).toContain('IF @userSegment == "Premium"');
      expect(ampscript).toContain('Premium content here');
    });

    it('should generate dynamic list AMPScript', () => {
      const config = { dataExtension: 'ProductList' };
      const ampscript = ampscriptIntegration.generateDynamicContentAMPScript('dynamic-list', config);
      
      expect(ampscript).toContain('Dynamic List Generation');
      expect(ampscript).toContain('LookupRows("ProductList"');
      expect(ampscript).toContain('FOR @i = 1 TO @listRowCount');
      expect(ampscript).toContain('Field(@currentRow, "Title")');
    });

    it('should generate personalized offers AMPScript', () => {
      const ampscript = ampscriptIntegration.generateDynamicContentAMPScript('personalized-offers', {});
      
      expect(ampscript).toContain('Personalized Offers');
      expect(ampscript).toContain('AttributeValue("Preferences")');
      expect(ampscript).toContain('LookupRows("Offers"');
      expect(ampscript).toContain('Field(@recommendedOffer, "PromoCode")');
    });
  });

  describe('generateFormPrePopulationAMPScript', () => {
    it('should generate form pre-population AMPScript', () => {
      const fields = ['FirstName', 'LastName', 'Email'];
      const ampscript = ampscriptIntegration.generateFormPrePopulationAMPScript(fields);
      
      expect(ampscript).toContain('Form Pre-population');
      expect(ampscript).toContain('VAR @FirstNameValue');
      expect(ampscript).toContain('AttributeValue("FirstName")');
      expect(ampscript).toContain('VAR @EmailValue');
    });
  });

  describe('generateEmailValidationAMPScript', () => {
    it('should generate email validation function', () => {
      const ampscript = ampscriptIntegration.generateEmailValidationAMPScript();
      
      expect(ampscript).toContain('Email Validation and Formatting');
      expect(ampscript).toContain('FUNCTION @ValidateAndFormatEmail');
      expect(ampscript).toContain('Trim(Lowercase(@email))');
      expect(ampscript).toContain('ValidateEmail(@cleanEmail)');
      expect(ampscript).toContain('ENDFUNCTION');
    });
  });

  describe('combineAMPScriptBlocks', () => {
    it('should combine AMPScript blocks in correct order', () => {
      const blocks = [
        { type: 'footer' as const, content: 'footer content', description: 'Footer' },
        { type: 'header' as const, content: 'header content', description: 'Header' },
        { type: 'inline' as const, content: 'inline content', description: 'Inline' }
      ];
      
      const combined = ampscriptIntegration.combineAMPScriptBlocks(blocks);
      
      expect(combined).toContain('<!-- AMPScript Header -->');
      expect(combined).toContain('<!-- AMPScript Inline Blocks -->');
      expect(combined).toContain('<!-- AMPScript Footer -->');
      
      const headerIndex = combined.indexOf('header content');
      const inlineIndex = combined.indexOf('inline content');
      const footerIndex = combined.indexOf('footer content');
      
      expect(headerIndex).toBeLessThan(inlineIndex);
      expect(inlineIndex).toBeLessThan(footerIndex);
    });

    it('should handle empty blocks array', () => {
      const combined = ampscriptIntegration.combineAMPScriptBlocks([]);
      expect(combined).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle configuration without forms', () => {
      mockConfig.components = [];
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      
      expect(blocks.some(b => b.description.includes('Form handling'))).toBe(false);
    });

    it('should handle configuration without data extensions', () => {
      mockConfig.advancedOptions.dataExtensionIntegration = [];
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      
      const dataBlock = blocks.find(b => b.description.includes('Data extension'));
      expect(dataBlock?.content.trim()).toBe('%%[\n  /* Data Extension Integration */\n  \n]%%');
    });

    it('should handle components without AMPScript', () => {
      mockConfig.components[0].ampscript = undefined;
      const blocks = ampscriptIntegration.generateAMPScript(mockConfig);
      
      const componentBlocks = blocks.filter(b => b.description.includes('component'));
      expect(componentBlocks).toHaveLength(0);
    });
  });
});