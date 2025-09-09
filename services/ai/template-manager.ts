import { CodeLanguage, CodeBlock } from '../../types/models'
import { Logger } from '../../utils/errors/error-handler'

export interface CodeTemplate {
  id: string
  name: string
  description: string
  language: CodeLanguage
  category: TemplateCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  template: string
  variables: TemplateVariable[]
  examples: TemplateExample[]
  documentation: string
  createdAt: Date
  updatedAt: Date
  usageCount: number
}

export interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  defaultValue?: any
  required: boolean
  validation?: string // regex pattern
}

export interface TemplateExample {
  title: string
  description: string
  variables: Record<string, any>
  expectedOutput: string
}

export type TemplateCategory = 
  | 'personalization'
  | 'data_operations'
  | 'email_content'
  | 'cloud_pages'
  | 'automation'
  | 'api_integration'
  | 'validation'
  | 'utilities'

export interface TemplateSearchOptions {
  language?: CodeLanguage
  category?: TemplateCategory
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  searchTerm?: string
}

export interface TemplateRenderOptions {
  variables: Record<string, any>
  includeComments?: boolean
  formatCode?: boolean
}

export class TemplateManager {
  private logger = new Logger('TemplateManager')
  private templates = new Map<string, CodeTemplate>()

  constructor() {
    this.initializeDefaultTemplates()
  }

  async getTemplate(id: string): Promise<CodeTemplate | null> {
    return this.templates.get(id) || null
  }

  async searchTemplates(options: TemplateSearchOptions = {}): Promise<CodeTemplate[]> {
    let results = Array.from(this.templates.values())

    // Filter by language
    if (options.language) {
      results = results.filter(template => template.language === options.language)
    }

    // Filter by category
    if (options.category) {
      results = results.filter(template => template.category === options.category)
    }

    // Filter by difficulty
    if (options.difficulty) {
      results = results.filter(template => template.difficulty === options.difficulty)
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      results = results.filter(template => 
        options.tags!.some(tag => template.tags.includes(tag))
      )
    }

    // Filter by search term
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase()
      results = results.filter(template => 
        template.name.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term) ||
        template.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    // Sort by usage count (most used first)
    results.sort((a, b) => b.usageCount - a.usageCount)

    return results
  }

  async renderTemplate(id: string, options: TemplateRenderOptions): Promise<string | null> {
    const template = await this.getTemplate(id)
    
    if (!template) {
      return null
    }

    try {
      // Validate required variables
      const missingVariables = template.variables
        .filter(variable => variable.required && !(variable.name in options.variables))
        .map(variable => variable.name)

      if (missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`)
      }

      // Render template with variables
      let rendered = template.template

      // Replace template variables
      template.variables.forEach(variable => {
        const value = options.variables[variable.name] ?? variable.defaultValue ?? ''
        const placeholder = `{{${variable.name}}}`
        rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value))
      })

      // Add comments if requested
      if (options.includeComments) {
        rendered = this.addTemplateComments(rendered, template)
      }

      // Format code if requested
      if (options.formatCode) {
        rendered = this.formatCode(rendered, template.language)
      }

      // Increment usage count
      template.usageCount++
      template.updatedAt = new Date()

      this.logger.info('Template rendered', { templateId: id, usageCount: template.usageCount })

      return rendered
    } catch (error) {
      this.logger.error('Template rendering failed', { templateId: id, error })
      throw error
    }
  }

  async getTemplatesByCategory(category: TemplateCategory): Promise<CodeTemplate[]> {
    return this.searchTemplates({ category })
  }

  async getTemplatesByLanguage(language: CodeLanguage): Promise<CodeTemplate[]> {
    return this.searchTemplates({ language })
  }

  async getPopularTemplates(limit: number = 10): Promise<CodeTemplate[]> {
    return Array.from(this.templates.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }

  async getRecommendedTemplates(
    language?: CodeLanguage, 
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Promise<CodeTemplate[]> {
    const options: TemplateSearchOptions = {
      difficulty: userLevel
    }

    if (language) {
      options.language = language
    }

    return this.searchTemplates(options)
  }

  private initializeDefaultTemplates(): void {
    // AMPScript Templates
    this.addTemplate({
      id: 'ampscript-personalization-basic',
      name: 'Basic Personalization',
      description: 'Simple personalization with first name and fallback',
      language: 'ampscript',
      category: 'personalization',
      difficulty: 'beginner',
      tags: ['personalization', 'greeting', 'fallback'],
      template: `%%[
SET @firstName = Field("FirstName")
IF Empty(@firstName) THEN
  SET @firstName = "{{fallbackName}}"
ENDIF
]%%
Hello %%=ProperCase(@firstName)=%%!`,
      variables: [
        {
          name: 'fallbackName',
          type: 'string',
          description: 'Fallback name when FirstName is empty',
          defaultValue: 'Valued Customer',
          required: false
        }
      ],
      examples: [
        {
          title: 'Standard greeting',
          description: 'Basic personalized greeting with fallback',
          variables: { fallbackName: 'Friend' },
          expectedOutput: 'Hello John! (or Hello Friend! if no first name)'
        }
      ],
      documentation: 'This template creates a personalized greeting that falls back to a default name if the subscriber\'s first name is not available.',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    })

    this.addTemplate({
      id: 'ampscript-data-lookup',
      name: 'Data Extension Lookup',
      description: 'Lookup data from a Data Extension with error handling',
      language: 'ampscript',
      category: 'data_operations',
      difficulty: 'intermediate',
      tags: ['lookup', 'data-extension', 'error-handling'],
      template: `%%[
SET @subscriberKey = Field("SubscriberKey")
SET @{{resultVariable}} = Lookup("{{dataExtensionName}}", "{{returnField}}", "{{keyField}}", @subscriberKey)

IF Empty(@{{resultVariable}}) THEN
  SET @{{resultVariable}} = "{{defaultValue}}"
ENDIF
]%%`,
      variables: [
        {
          name: 'dataExtensionName',
          type: 'string',
          description: 'Name of the Data Extension to lookup',
          required: true
        },
        {
          name: 'returnField',
          type: 'string',
          description: 'Field to return from the lookup',
          required: true
        },
        {
          name: 'keyField',
          type: 'string',
          description: 'Key field to match against',
          defaultValue: 'SubscriberKey',
          required: false
        },
        {
          name: 'resultVariable',
          type: 'string',
          description: 'Variable name to store the result',
          defaultValue: 'result',
          required: false
        },
        {
          name: 'defaultValue',
          type: 'string',
          description: 'Default value if lookup returns empty',
          defaultValue: 'N/A',
          required: false
        }
      ],
      examples: [
        {
          title: 'Product lookup',
          description: 'Look up product name from purchase data',
          variables: {
            dataExtensionName: 'PurchaseHistory',
            returnField: 'ProductName',
            keyField: 'CustomerID',
            resultVariable: 'productName',
            defaultValue: 'Unknown Product'
          },
          expectedOutput: 'Sets @productName variable with product name or default'
        }
      ],
      documentation: 'Performs a safe lookup operation with error handling and default values.',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    })

    // SSJS Templates
    this.addTemplate({
      id: 'ssjs-data-extension-crud',
      name: 'Data Extension CRUD Operations',
      description: 'Complete CRUD operations for Data Extensions',
      language: 'ssjs',
      category: 'data_operations',
      difficulty: 'intermediate',
      tags: ['data-extension', 'crud', 'platform'],
      template: `<script runat="server">
Platform.Load("Core", "1");

try {
    // Initialize Data Extension
    var de = DataExtension.Init("{{dataExtensionKey}}");
    
    // CREATE - Add new record
    var newRecord = {
        "{{keyField}}": "{{keyValue}}",
        "{{dataField}}": "{{dataValue}}"
    };
    de.Rows.Add(newRecord);
    
    // READ - Retrieve records
    var filter = {
        Property: "{{keyField}}",
        SimpleOperator: "equals",
        Value: "{{keyValue}}"
    };
    var results = de.Rows.Retrieve(filter);
    
    // UPDATE - Modify existing record
    if (results && results.length > 0) {
        results[0]["{{dataField}}"] = "{{updatedValue}}";
        de.Rows.Update(results[0], ["{{keyField}}"], [results[0]["{{keyField}}"]]);
    }
    
    Write("Operation completed successfully");
    
} catch (ex) {
    Write("Error: " + Stringify(ex));
}
</script>`,
      variables: [
        {
          name: 'dataExtensionKey',
          type: 'string',
          description: 'External key of the Data Extension',
          required: true
        },
        {
          name: 'keyField',
          type: 'string',
          description: 'Primary key field name',
          defaultValue: 'SubscriberKey',
          required: false
        },
        {
          name: 'keyValue',
          type: 'string',
          description: 'Value for the key field',
          required: true
        },
        {
          name: 'dataField',
          type: 'string',
          description: 'Data field to manipulate',
          required: true
        },
        {
          name: 'dataValue',
          type: 'string',
          description: 'Initial value for the data field',
          required: true
        },
        {
          name: 'updatedValue',
          type: 'string',
          description: 'Updated value for the data field',
          required: true
        }
      ],
      examples: [
        {
          title: 'Customer preferences',
          description: 'Manage customer preference data',
          variables: {
            dataExtensionKey: 'CustomerPreferences',
            keyField: 'CustomerID',
            keyValue: '12345',
            dataField: 'EmailFrequency',
            dataValue: 'Weekly',
            updatedValue: 'Monthly'
          },
          expectedOutput: 'Creates, reads, and updates customer preference record'
        }
      ],
      documentation: 'Comprehensive template for Data Extension operations with error handling.',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    })

    // SQL Templates
    this.addTemplate({
      id: 'sql-segmentation-query',
      name: 'Customer Segmentation Query',
      description: 'Query to segment customers based on behavior and demographics',
      language: 'sql',
      category: 'data_operations',
      difficulty: 'advanced',
      tags: ['segmentation', 'analytics', 'customer-behavior'],
      template: `SELECT TOP {{limit}}
    s.SubscriberKey,
    s.EmailAddress,
    s.FirstName,
    s.LastName,
    CASE 
        WHEN p.TotalPurchases >= {{highValueThreshold}} THEN 'High Value'
        WHEN p.TotalPurchases >= {{mediumValueThreshold}} THEN 'Medium Value'
        ELSE 'Low Value'
    END AS CustomerSegment,
    p.TotalPurchases,
    p.LastPurchaseDate,
    DATEDIFF(DAY, p.LastPurchaseDate, GETDATE()) AS DaysSinceLastPurchase
FROM Subscribers s
INNER JOIN (
    SELECT 
        SubscriberKey,
        COUNT(*) AS TotalPurchases,
        MAX(PurchaseDate) AS LastPurchaseDate,
        SUM(PurchaseAmount) AS TotalSpent
    FROM PurchaseHistory
    WHERE PurchaseDate >= DATEADD({{timeframe}}, -{{timeframeValue}}, GETDATE())
    GROUP BY SubscriberKey
) p ON s.SubscriberKey = p.SubscriberKey
WHERE s.Status = 'Active'
    AND p.TotalPurchases >= {{minPurchases}}
ORDER BY p.TotalSpent DESC`,
      variables: [
        {
          name: 'limit',
          type: 'number',
          description: 'Maximum number of records to return',
          defaultValue: 1000,
          required: false
        },
        {
          name: 'highValueThreshold',
          type: 'number',
          description: 'Minimum purchases for high value segment',
          defaultValue: 10,
          required: false
        },
        {
          name: 'mediumValueThreshold',
          type: 'number',
          description: 'Minimum purchases for medium value segment',
          defaultValue: 5,
          required: false
        },
        {
          name: 'timeframe',
          type: 'string',
          description: 'Time unit (MONTH, DAY, YEAR)',
          defaultValue: 'MONTH',
          required: false
        },
        {
          name: 'timeframeValue',
          type: 'number',
          description: 'Number of time units to look back',
          defaultValue: 12,
          required: false
        },
        {
          name: 'minPurchases',
          type: 'number',
          description: 'Minimum number of purchases to include',
          defaultValue: 1,
          required: false
        }
      ],
      examples: [
        {
          title: 'Last 6 months segmentation',
          description: 'Segment customers based on last 6 months activity',
          variables: {
            limit: 5000,
            highValueThreshold: 15,
            mediumValueThreshold: 8,
            timeframe: 'MONTH',
            timeframeValue: 6,
            minPurchases: 2
          },
          expectedOutput: 'Returns segmented customer list with purchase behavior'
        }
      ],
      documentation: 'Advanced segmentation query that categorizes customers based on purchase behavior and recency.',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    })

    this.logger.info('Default templates initialized', { 
      templateCount: this.templates.size 
    })
  }

  private addTemplate(template: CodeTemplate): void {
    this.templates.set(template.id, template)
  }

  private addTemplateComments(code: string, template: CodeTemplate): string {
    const header = `/*
 * Template: ${template.name}
 * Description: ${template.description}
 * Language: ${template.language}
 * Category: ${template.category}
 * Generated: ${new Date().toISOString()}
 */\n\n`

    return header + code
  }

  private formatCode(code: string, language: CodeLanguage): string {
    // Basic code formatting - in a real implementation, 
    // this would use proper formatters for each language
    switch (language) {
      case 'ampscript':
        return this.formatAMPScript(code)
      case 'ssjs':
        return this.formatSSJS(code)
      case 'sql':
        return this.formatSQL(code)
      default:
        return code
    }
  }

  private formatAMPScript(code: string): string {
    // Basic AMPScript formatting
    return code
      .replace(/%%\[/g, '%%[\n  ')
      .replace(/\]%%/g, '\n]%%')
      .replace(/SET @/g, '\n  SET @')
      .replace(/IF /g, '\n  IF ')
      .replace(/ENDIF/g, '\n  ENDIF')
  }

  private formatSSJS(code: string): string {
    // Basic SSJS formatting
    return code
      .replace(/;/g, ';\n')
      .replace(/{/g, '{\n  ')
      .replace(/}/g, '\n}')
  }

  private formatSQL(code: string): string {
    // Basic SQL formatting
    return code
      .replace(/SELECT/gi, 'SELECT\n  ')
      .replace(/FROM/gi, '\nFROM\n  ')
      .replace(/WHERE/gi, '\nWHERE\n  ')
      .replace(/ORDER BY/gi, '\nORDER BY\n  ')
      .replace(/GROUP BY/gi, '\nGROUP BY\n  ')
  }
}