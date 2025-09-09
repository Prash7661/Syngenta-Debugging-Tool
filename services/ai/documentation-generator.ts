import { CodeLanguage, CodeBlock } from '../../types/models'
import { Logger } from '../../utils/errors/error-handler'

export interface DocumentationOptions {
  includeComments: boolean
  includeExamples: boolean
  includeUsage: boolean
  includeBestPractices: boolean
  format: 'markdown' | 'html' | 'plain'
  verbosity: 'minimal' | 'standard' | 'comprehensive'
}

export interface CodeDocumentation {
  summary: string
  description: string
  parameters?: ParameterDoc[]
  returnValue?: string
  examples?: ExampleDoc[]
  bestPractices?: string[]
  relatedFunctions?: string[]
  complexity: 'low' | 'medium' | 'high'
  performance: PerformanceNotes
}

export interface ParameterDoc {
  name: string
  type: string
  description: string
  required: boolean
  defaultValue?: string
  examples?: string[]
}

export interface ExampleDoc {
  title: string
  description: string
  code: string
  output?: string
  notes?: string
}

export interface PerformanceNotes {
  timeComplexity?: string
  spaceComplexity?: string
  recommendations?: string[]
  warnings?: string[]
}

export class DocumentationGenerator {
  private logger = new Logger('DocumentationGenerator')

  async generateDocumentation(
    code: string,
    language: CodeLanguage,
    options: Partial<DocumentationOptions> = {}
  ): Promise<string> {
    const fullOptions: DocumentationOptions = {
      includeComments: true,
      includeExamples: true,
      includeUsage: true,
      includeBestPractices: true,
      format: 'markdown',
      verbosity: 'standard',
      ...options
    }

    try {
      const analysis = await this.analyzeCode(code, language)
      const documentation = await this.buildDocumentation(analysis, language, fullOptions)
      
      return this.formatDocumentation(documentation, fullOptions.format)
    } catch (error) {
      this.logger.error('Documentation generation failed', { error, language })
      throw error
    }
  }

  async generateCodeComments(
    code: string,
    language: CodeLanguage,
    style: 'inline' | 'block' | 'docstring' = 'inline'
  ): Promise<string> {
    const analysis = await this.analyzeCode(code, language)
    return this.addInlineComments(code, analysis, language, style)
  }

  async generateUsageExamples(
    code: string,
    language: CodeLanguage,
    count: number = 3
  ): Promise<ExampleDoc[]> {
    const analysis = await this.analyzeCode(code, language)
    return this.generateExamples(analysis, language, count)
  }

  async generateBestPractices(
    code: string,
    language: CodeLanguage
  ): Promise<string[]> {
    const analysis = await this.analyzeCode(code, language)
    return this.extractBestPractices(analysis, language)
  }

  private async analyzeCode(code: string, language: CodeLanguage): Promise<CodeDocumentation> {
    // This would typically use AI or static analysis
    // For now, we'll provide language-specific analysis
    
    switch (language) {
      case 'ampscript':
        return this.analyzeAMPScript(code)
      case 'ssjs':
        return this.analyzeSSJS(code)
      case 'sql':
        return this.analyzeSQL(code)
      default:
        return this.getDefaultAnalysis(code, language)
    }
  }

  private analyzeAMPScript(code: string): CodeDocumentation {
    const functions = this.extractAMPScriptFunctions(code)
    const variables = this.extractAMPScriptVariables(code)
    const lookups = this.extractDataLookups(code)

    return {
      summary: this.generateAMPScriptSummary(code, functions, variables, lookups),
      description: this.generateAMPScriptDescription(code, functions, variables, lookups),
      parameters: this.extractAMPScriptParameters(variables),
      examples: this.generateAMPScriptExamples(code, functions),
      bestPractices: this.getAMPScriptBestPractices(code, functions, lookups),
      relatedFunctions: this.getRelatedAMPScriptFunctions(functions),
      complexity: this.assessComplexity(code, functions.length, lookups.length),
      performance: this.analyzeAMPScriptPerformance(code, lookups)
    }
  }

  private analyzeSSJS(code: string): CodeDocumentation {
    const platformCalls = this.extractPlatformCalls(code)
    const dataExtensions = this.extractDataExtensionCalls(code)
    const httpCalls = this.extractHttpCalls(code)

    return {
      summary: this.generateSSJSSummary(code, platformCalls, dataExtensions, httpCalls),
      description: this.generateSSJSDescription(code, platformCalls, dataExtensions, httpCalls),
      examples: this.generateSSJSExamples(code, platformCalls),
      bestPractices: this.getSSJSBestPractices(code, dataExtensions, httpCalls),
      relatedFunctions: this.getRelatedSSJSFunctions(platformCalls),
      complexity: this.assessComplexity(code, platformCalls.length, dataExtensions.length),
      performance: this.analyzeSSJSPerformance(code, httpCalls, dataExtensions)
    }
  }

  private analyzeSQL(code: string): CodeDocumentation {
    const tables = this.extractTableReferences(code)
    const joins = this.extractJoins(code)
    const functions = this.extractSQLFunctions(code)

    return {
      summary: this.generateSQLSummary(code, tables, joins, functions),
      description: this.generateSQLDescription(code, tables, joins, functions),
      examples: this.generateSQLExamples(code, tables),
      bestPractices: this.getSQLBestPractices(code, joins, functions),
      relatedFunctions: this.getRelatedSQLFunctions(functions),
      complexity: this.assessComplexity(code, joins.length, functions.length),
      performance: this.analyzeSQLPerformance(code, joins, tables)
    }
  }

  private getDefaultAnalysis(code: string, language: CodeLanguage): CodeDocumentation {
    return {
      summary: `${language} code snippet`,
      description: `This is a ${language} code implementation.`,
      complexity: 'medium',
      performance: {
        recommendations: ['Review code for optimization opportunities'],
        warnings: []
      }
    }
  }

  private buildDocumentation(
    analysis: CodeDocumentation,
    language: CodeLanguage,
    options: DocumentationOptions
  ): CodeDocumentation {
    const doc: CodeDocumentation = { ...analysis }

    if (!options.includeExamples) {
      delete doc.examples
    }

    if (!options.includeBestPractices) {
      delete doc.bestPractices
    }

    if (options.verbosity === 'minimal') {
      doc.description = doc.summary
      delete doc.examples
      delete doc.bestPractices
      delete doc.relatedFunctions
    } else if (options.verbosity === 'comprehensive') {
      // Add more detailed information
      doc.examples = doc.examples || []
      doc.bestPractices = doc.bestPractices || []
      doc.relatedFunctions = doc.relatedFunctions || []
    }

    return doc
  }

  private formatDocumentation(doc: CodeDocumentation, format: 'markdown' | 'html' | 'plain'): string {
    switch (format) {
      case 'markdown':
        return this.formatAsMarkdown(doc)
      case 'html':
        return this.formatAsHTML(doc)
      case 'plain':
        return this.formatAsPlainText(doc)
      default:
        return this.formatAsMarkdown(doc)
    }
  }

  private formatAsMarkdown(doc: CodeDocumentation): string {
    let markdown = `# ${doc.summary}\n\n`
    markdown += `${doc.description}\n\n`

    if (doc.parameters && doc.parameters.length > 0) {
      markdown += `## Parameters\n\n`
      doc.parameters.forEach(param => {
        markdown += `- **${param.name}** (${param.type}): ${param.description}`
        if (!param.required) markdown += ` (optional)`
        if (param.defaultValue) markdown += ` - Default: \`${param.defaultValue}\``
        markdown += `\n`
      })
      markdown += `\n`
    }

    if (doc.examples && doc.examples.length > 0) {
      markdown += `## Examples\n\n`
      doc.examples.forEach((example, index) => {
        markdown += `### ${example.title}\n\n`
        markdown += `${example.description}\n\n`
        markdown += `\`\`\`\n${example.code}\n\`\`\`\n\n`
        if (example.output) {
          markdown += `**Output:** ${example.output}\n\n`
        }
        if (example.notes) {
          markdown += `*Note: ${example.notes}*\n\n`
        }
      })
    }

    if (doc.bestPractices && doc.bestPractices.length > 0) {
      markdown += `## Best Practices\n\n`
      doc.bestPractices.forEach(practice => {
        markdown += `- ${practice}\n`
      })
      markdown += `\n`
    }

    if (doc.performance.recommendations && doc.performance.recommendations.length > 0) {
      markdown += `## Performance Notes\n\n`
      doc.performance.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`
      })
      markdown += `\n`
    }

    if (doc.relatedFunctions && doc.relatedFunctions.length > 0) {
      markdown += `## Related Functions\n\n`
      doc.relatedFunctions.forEach(func => {
        markdown += `- \`${func}\`\n`
      })
      markdown += `\n`
    }

    return markdown
  }

  private formatAsHTML(doc: CodeDocumentation): string {
    // Basic HTML formatting - would be more sophisticated in real implementation
    return `
      <div class="code-documentation">
        <h1>${doc.summary}</h1>
        <p>${doc.description}</p>
        ${doc.examples ? this.formatExamplesAsHTML(doc.examples) : ''}
        ${doc.bestPractices ? this.formatBestPracticesAsHTML(doc.bestPractices) : ''}
      </div>
    `
  }

  private formatAsPlainText(doc: CodeDocumentation): string {
    let text = `${doc.summary}\n${'='.repeat(doc.summary.length)}\n\n`
    text += `${doc.description}\n\n`

    if (doc.examples && doc.examples.length > 0) {
      text += `Examples:\n${'-'.repeat(8)}\n`
      doc.examples.forEach(example => {
        text += `${example.title}: ${example.description}\n`
        text += `${example.code}\n\n`
      })
    }

    return text
  }

  private formatExamplesAsHTML(examples: ExampleDoc[]): string {
    return `
      <h2>Examples</h2>
      ${examples.map(example => `
        <h3>${example.title}</h3>
        <p>${example.description}</p>
        <pre><code>${example.code}</code></pre>
      `).join('')}
    `
  }

  private formatBestPracticesAsHTML(practices: string[]): string {
    return `
      <h2>Best Practices</h2>
      <ul>
        ${practices.map(practice => `<li>${practice}</li>`).join('')}
      </ul>
    `
  }

  private addInlineComments(
    code: string,
    analysis: CodeDocumentation,
    language: CodeLanguage,
    style: 'inline' | 'block' | 'docstring'
  ): string {
    // This would add appropriate comments based on the language and style
    // For now, return the original code with a header comment
    const commentPrefix = this.getCommentPrefix(language)
    const header = `${commentPrefix} ${analysis.summary}\n${commentPrefix} ${analysis.description}\n\n`
    
    return header + code
  }

  private getCommentPrefix(language: CodeLanguage): string {
    switch (language) {
      case 'ampscript':
        return '/*'
      case 'ssjs':
        return '//'
      case 'sql':
        return '--'
      default:
        return '//'
    }
  }

  // Helper methods for code analysis (simplified implementations)
  private extractAMPScriptFunctions(code: string): string[] {
    const matches = code.match(/\b([A-Z][a-zA-Z]*)\s*\(/g) || []
    return matches.map(match => match.replace(/\s*\($/, ''))
  }

  private extractAMPScriptVariables(code: string): string[] {
    const matches = code.match(/@[a-zA-Z][a-zA-Z0-9_]*/g) || []
    return [...new Set(matches)]
  }

  private extractDataLookups(code: string): string[] {
    const matches = code.match(/Lookup\s*\([^)]+\)/g) || []
    return matches
  }

  private extractPlatformCalls(code: string): string[] {
    const matches = code.match(/Platform\.[A-Za-z.]+/g) || []
    return [...new Set(matches)]
  }

  private extractDataExtensionCalls(code: string): string[] {
    const matches = code.match(/DataExtension\.[A-Za-z.]+/g) || []
    return [...new Set(matches)]
  }

  private extractHttpCalls(code: string): string[] {
    const matches = code.match(/HTTP\.[A-Za-z]+/g) || []
    return [...new Set(matches)]
  }

  private extractTableReferences(code: string): string[] {
    const matches = code.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi) || []
    return matches.map(match => match.replace(/FROM\s+/i, ''))
  }

  private extractJoins(code: string): string[] {
    const matches = code.match(/\b(INNER|LEFT|RIGHT|FULL)\s+JOIN/gi) || []
    return matches
  }

  private extractSQLFunctions(code: string): string[] {
    const matches = code.match(/\b([A-Z_]+)\s*\(/g) || []
    return [...new Set(matches.map(match => match.replace(/\s*\($/, '')))]
  }

  private generateAMPScriptSummary(code: string, functions: string[], variables: string[], lookups: string[]): string {
    if (lookups.length > 0) {
      return 'AMPScript data lookup and personalization'
    } else if (functions.length > 0) {
      return `AMPScript using ${functions.slice(0, 2).join(', ')} functions`
    } else {
      return 'AMPScript code block'
    }
  }

  private generateAMPScriptDescription(code: string, functions: string[], variables: string[], lookups: string[]): string {
    let desc = 'This AMPScript code '
    
    if (lookups.length > 0) {
      desc += `performs ${lookups.length} data lookup${lookups.length > 1 ? 's' : ''} `
    }
    
    if (functions.length > 0) {
      desc += `uses functions: ${functions.join(', ')} `
    }
    
    if (variables.length > 0) {
      desc += `and manages ${variables.length} variable${variables.length > 1 ? 's' : ''}`
    }
    
    return desc + '.'
  }

  private generateSSJSSummary(code: string, platformCalls: string[], dataExtensions: string[], httpCalls: string[]): string {
    if (httpCalls.length > 0) {
      return 'SSJS HTTP API integration'
    } else if (dataExtensions.length > 0) {
      return 'SSJS Data Extension operations'
    } else if (platformCalls.length > 0) {
      return 'SSJS Platform utility functions'
    } else {
      return 'Server-Side JavaScript code'
    }
  }

  private generateSSJSDescription(code: string, platformCalls: string[], dataExtensions: string[], httpCalls: string[]): string {
    return `This SSJS code implements server-side logic using ${platformCalls.length + dataExtensions.length + httpCalls.length} SFMC platform calls.`
  }

  private generateSQLSummary(code: string, tables: string[], joins: string[], functions: string[]): string {
    if (joins.length > 0) {
      return `SQL query with ${joins.length} join${joins.length > 1 ? 's' : ''}`
    } else if (tables.length > 1) {
      return 'SQL multi-table query'
    } else {
      return 'SQL data query'
    }
  }

  private generateSQLDescription(code: string, tables: string[], joins: string[], functions: string[]): string {
    return `This SQL query retrieves data from ${tables.length} table${tables.length > 1 ? 's' : ''} using ${functions.length} function${functions.length > 1 ? 's' : ''}.`
  }

  private assessComplexity(code: string, functionsCount: number, operationsCount: number): 'low' | 'medium' | 'high' {
    const totalComplexity = functionsCount + operationsCount + (code.length / 100)
    
    if (totalComplexity < 5) return 'low'
    if (totalComplexity < 15) return 'medium'
    return 'high'
  }

  private analyzeAMPScriptPerformance(code: string, lookups: string[]): PerformanceNotes {
    const recommendations: string[] = []
    const warnings: string[] = []

    if (lookups.length > 3) {
      warnings.push('Multiple lookups may impact email rendering performance')
      recommendations.push('Consider consolidating lookups or using LookupRows for multiple values')
    }

    return { recommendations, warnings }
  }

  private analyzeSSJSPerformance(code: string, httpCalls: string[], dataExtensions: string[]): PerformanceNotes {
    const recommendations: string[] = []
    const warnings: string[] = []

    if (httpCalls.length > 2) {
      warnings.push('Multiple HTTP calls may cause timeout issues')
      recommendations.push('Consider batch processing or asynchronous operations')
    }

    return { recommendations, warnings }
  }

  private analyzeSQLPerformance(code: string, joins: string[], tables: string[]): PerformanceNotes {
    const recommendations: string[] = []
    const warnings: string[] = []

    if (joins.length > 3) {
      warnings.push('Complex joins may impact query performance')
      recommendations.push('Ensure proper indexing on join columns')
    }

    if (!code.toUpperCase().includes('TOP')) {
      recommendations.push('Consider adding TOP clause to limit results')
    }

    return { recommendations, warnings }
  }

  private generateAMPScriptExamples(code: string, functions: string[]): ExampleDoc[] {
    // Generate contextual examples based on the functions used
    return []
  }

  private generateSSJSExamples(code: string, platformCalls: string[]): ExampleDoc[] {
    return []
  }

  private generateSQLExamples(code: string, tables: string[]): ExampleDoc[] {
    return []
  }

  private generateExamples(analysis: CodeDocumentation, language: CodeLanguage, count: number): ExampleDoc[] {
    return analysis.examples?.slice(0, count) || []
  }

  private extractBestPractices(analysis: CodeDocumentation, language: CodeLanguage): string[] {
    return analysis.bestPractices || []
  }

  private extractAMPScriptParameters(variables: string[]): ParameterDoc[] {
    return variables.map(variable => ({
      name: variable,
      type: 'string',
      description: `Variable ${variable}`,
      required: false
    }))
  }

  private getAMPScriptBestPractices(code: string, functions: string[], lookups: string[]): string[] {
    const practices: string[] = []
    
    if (lookups.length > 0) {
      practices.push('Always check for empty lookup results using IsNull() or Empty()')
    }
    
    if (functions.includes('Field')) {
      practices.push('Use ProperCase() for consistent name formatting')
    }
    
    return practices
  }

  private getSSJSBestPractices(code: string, dataExtensions: string[], httpCalls: string[]): string[] {
    const practices: string[] = []
    
    practices.push('Always wrap operations in try-catch blocks')
    
    if (dataExtensions.length > 0) {
      practices.push('Use Platform.Load("Core", "1") before DataExtension operations')
    }
    
    return practices
  }

  private getSQLBestPractices(code: string, joins: string[], functions: string[]): string[] {
    const practices: string[] = []
    
    practices.push('Use TOP clause to limit results and prevent timeouts')
    practices.push('Specify column names instead of SELECT *')
    
    if (joins.length > 0) {
      practices.push('Ensure proper indexing on join columns')
    }
    
    return practices
  }

  private getRelatedAMPScriptFunctions(functions: string[]): string[] {
    const related: string[] = []
    
    if (functions.includes('Lookup')) {
      related.push('LookupRows', 'LookupOrderedRows')
    }
    
    if (functions.includes('Field')) {
      related.push('AttributeValue', 'RequestParameter')
    }
    
    return related
  }

  private getRelatedSSJSFunctions(platformCalls: string[]): string[] {
    return []
  }

  private getRelatedSQLFunctions(functions: string[]): string[] {
    return []
  }
}