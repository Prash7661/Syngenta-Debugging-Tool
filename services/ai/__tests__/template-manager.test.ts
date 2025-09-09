import { TemplateManager } from '../template-manager'

describe('TemplateManager', () => {
  let templateManager: TemplateManager

  beforeEach(() => {
    templateManager = new TemplateManager()
  })

  describe('template search', () => {
    it('should find templates by language', async () => {
      const ampscriptTemplates = await templateManager.searchTemplates({ 
        language: 'ampscript' 
      })

      expect(ampscriptTemplates.length).toBeGreaterThan(0)
      ampscriptTemplates.forEach(template => {
        expect(template.language).toBe('ampscript')
      })
    })

    it('should find templates by category', async () => {
      const personalizationTemplates = await templateManager.searchTemplates({ 
        category: 'personalization' 
      })

      expect(personalizationTemplates.length).toBeGreaterThan(0)
      personalizationTemplates.forEach(template => {
        expect(template.category).toBe('personalization')
      })
    })

    it('should find templates by search term', async () => {
      const lookupTemplates = await templateManager.searchTemplates({ 
        searchTerm: 'lookup' 
      })

      expect(lookupTemplates.length).toBeGreaterThan(0)
      lookupTemplates.forEach(template => {
        expect(
          template.name.toLowerCase().includes('lookup') ||
          template.description.toLowerCase().includes('lookup') ||
          template.tags.some(tag => tag.toLowerCase().includes('lookup'))
        ).toBe(true)
      })
    })

    it('should return empty array for non-existent search', async () => {
      const results = await templateManager.searchTemplates({ 
        searchTerm: 'nonexistenttemplate12345' 
      })

      expect(results).toHaveLength(0)
    })
  })

  describe('template rendering', () => {
    it('should render AMPScript personalization template', async () => {
      const rendered = await templateManager.renderTemplate(
        'ampscript-personalization-basic',
        { fallbackName: 'Friend' }
      )

      expect(rendered).toContain('Friend')
      expect(rendered).toContain('%%=ProperCase(@firstName)=%%')
    })

    it('should render data lookup template with variables', async () => {
      const rendered = await templateManager.renderTemplate(
        'ampscript-data-lookup',
        {
          dataExtensionName: 'CustomerData',
          returnField: 'ProductName',
          keyField: 'CustomerID',
          resultVariable: 'product',
          defaultValue: 'Unknown'
        }
      )

      expect(rendered).toContain('CustomerData')
      expect(rendered).toContain('ProductName')
      expect(rendered).toContain('CustomerID')
      expect(rendered).toContain('@product')
      expect(rendered).toContain('Unknown')
    })

    it('should fail with missing required variables', async () => {
      await expect(
        templateManager.renderTemplate('ampscript-data-lookup', {})
      ).rejects.toThrow('Missing required variables')
    })

    it('should return null for non-existent template', async () => {
      const rendered = await templateManager.renderTemplate(
        'non-existent-template',
        {}
      )

      expect(rendered).toBeNull()
    })
  })

  describe('template categories', () => {
    it('should get templates by category', async () => {
      const dataTemplates = await templateManager.getTemplatesByCategory('data_operations')

      expect(dataTemplates.length).toBeGreaterThan(0)
      dataTemplates.forEach(template => {
        expect(template.category).toBe('data_operations')
      })
    })
  })

  describe('template recommendations', () => {
    it('should get recommended templates for beginners', async () => {
      const recommendations = await templateManager.getRecommendedTemplates('ampscript', 'beginner')

      expect(recommendations.length).toBeGreaterThan(0)
      recommendations.forEach(template => {
        expect(template.difficulty).toBe('beginner')
        expect(template.language).toBe('ampscript')
      })
    })

    it('should get popular templates', async () => {
      // First, render some templates to increase usage count
      await templateManager.renderTemplate('ampscript-personalization-basic', { fallbackName: 'Test' })
      await templateManager.renderTemplate('ampscript-personalization-basic', { fallbackName: 'Test' })

      const popular = await templateManager.getPopularTemplates(5)

      expect(popular.length).toBeGreaterThan(0)
      expect(popular.length).toBeLessThanOrEqual(5)
      
      // Should be sorted by usage count
      for (let i = 1; i < popular.length; i++) {
        expect(popular[i].usageCount).toBeLessThanOrEqual(popular[i - 1].usageCount)
      }
    })
  })

  describe('template validation', () => {
    it('should validate template variables', async () => {
      const template = await templateManager.getTemplate('ampscript-data-lookup')
      
      expect(template).toBeTruthy()
      expect(template!.variables).toBeDefined()
      expect(template!.variables.length).toBeGreaterThan(0)
      
      const requiredVars = template!.variables.filter(v => v.required)
      expect(requiredVars.length).toBeGreaterThan(0)
    })
  })
})