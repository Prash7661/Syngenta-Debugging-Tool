import { PerformanceMetrics, ComplexityMetrics, MemoryMetrics, PerformanceRecommendation, CodeLanguage } from '../../../types/debugging'
import { PerformanceMetricsCalculator } from '../performance-metrics-calculator'

export class PerformanceAnalyzer {
  private metricsCalculator: PerformanceMetricsCalculator

  constructor() {
    this.metricsCalculator = new PerformanceMetricsCalculator()
  }

  async analyze(code: string, language: CodeLanguage): Promise<PerformanceMetrics> {
    // Use the new performance metrics calculator for comprehensive analysis
    const detailedMetrics = await this.metricsCalculator.calculateMetrics(code, language)
    
    // Combine with legacy analysis for backward compatibility
    const legacyRecommendations = this.generateRecommendations(code, language, detailedMetrics.complexity)
    
    return {
      ...detailedMetrics,
      recommendations: [
        ...detailedMetrics.recommendations,
        ...legacyRecommendations
      ]
    }
  }

  private analyzeComplexity(code: string, language: CodeLanguage): ComplexityMetrics {
    const lines = code.split('\n').filter(line => line.trim() !== '')
    const linesOfCode = lines.length

    // Calculate cyclomatic complexity
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code, language)
    
    // Calculate cognitive complexity
    const cognitiveComplexity = this.calculateCognitiveComplexity(code, language)
    
    // Calculate nesting depth
    const nestingDepth = this.calculateNestingDepth(code, language)

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      nestingDepth,
      linesOfCode
    }
  }

  private analyzeMemoryUsage(code: string, language: CodeLanguage): MemoryMetrics {
    let estimatedMemoryUsage = 0
    let variableCount = 0
    let stringConcatenations = 0
    let arrayOperations = 0

    const lines = code.split('\n')

    for (const line of lines) {
      // Count variables based on language
      variableCount += this.countVariables(line, language)
      
      // Count string operations
      stringConcatenations += this.countStringConcatenations(line, language)
      
      // Count array operations
      arrayOperations += this.countArrayOperations(line, language)
    }

    // Estimate memory usage based on operations
    estimatedMemoryUsage = this.estimateMemoryFromOperations(
      variableCount, 
      stringConcatenations, 
      arrayOperations, 
      language
    )

    return {
      estimatedMemoryUsage,
      variableCount,
      stringConcatenations,
      arrayOperations
    }
  }

  private estimateExecutionTime(code: string, language: CodeLanguage, complexity: ComplexityMetrics): number {
    // Base execution time per line (in milliseconds)
    const baseTimePerLine = this.getBaseTimePerLine(language)
    
    // Complexity multiplier
    const complexityMultiplier = 1 + (complexity.cyclomaticComplexity * 0.1) + (complexity.nestingDepth * 0.2)
    
    // API call overhead
    const apiCalls = this.countAPICalls(code, language)
    const apiOverhead = apiCalls * this.getAPICallOverhead(language)
    
    return (complexity.linesOfCode * baseTimePerLine * complexityMultiplier) + apiOverhead
  }

  private countAPICalls(code: string, language: CodeLanguage): number {
    let apiCallCount = 0
    
    switch (language) {
      case 'ampscript':
        const ampscriptAPIs = ['HTTPGet', 'HTTPPost', 'HTTPPut', 'HTTPDelete', 'Lookup', 'LookupRows', 'InsertData', 'UpdateData', 'UpsertData', 'DeleteData']
        ampscriptAPIs.forEach(api => {
          apiCallCount += (code.match(new RegExp(api + '\\(', 'gi')) || []).length
        })
        break
        
      case 'ssjs':
        const ssjsAPIs = ['WSProxy', 'HTTP.Get', 'HTTP.Post', 'DataExtension.Init', 'Platform.Function']
        ssjsAPIs.forEach(api => {
          apiCallCount += (code.match(new RegExp(api.replace('.', '\\.') + '\\(', 'gi')) || []).length
        })
        break
        
      case 'sql':
        // SQL doesn't have traditional API calls, but we can count complex operations
        const sqlOperations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'JOIN']
        sqlOperations.forEach(op => {
          apiCallCount += (code.match(new RegExp('\\b' + op + '\\b', 'gi')) || []).length
        })
        break
        
      default:
        // For HTML, CSS, JavaScript - count external resource references
        apiCallCount += (code.match(/fetch\(|XMLHttpRequest|ajax/gi) || []).length
    }
    
    return apiCallCount
  }

  private analyzeLoopComplexity(code: string, language: CodeLanguage): number {
    let loopComplexity = 0
    let nestingLevel = 0
    const lines = code.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Detect loop starts based on language
      if (this.isLoopStart(trimmedLine, language)) {
        nestingLevel++
        loopComplexity += nestingLevel // Nested loops have exponential complexity
      }
      
      // Detect loop ends
      if (this.isLoopEnd(trimmedLine, language)) {
        nestingLevel = Math.max(0, nestingLevel - 1)
      }
    }

    return loopComplexity
  }

  private generateRecommendations(code: string, language: CodeLanguage, complexity: ComplexityMetrics): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []

    // High complexity recommendations
    if (complexity.cyclomaticComplexity > 10) {
      recommendations.push({
        type: 'refactoring',
        message: 'High cyclomatic complexity detected. Consider breaking down into smaller functions.',
        impact: 'high',
        line: 1
      })
    }

    if (complexity.nestingDepth > 4) {
      recommendations.push({
        type: 'refactoring',
        message: 'Deep nesting detected. Consider extracting nested logic into separate functions.',
        impact: 'medium',
        line: 1
      })
    }

    // Language-specific recommendations
    recommendations.push(...this.getLanguageSpecificRecommendations(code, language))

    return recommendations
  }

  private calculateCyclomaticComplexity(code: string, language: CodeLanguage): number {
    let complexity = 1 // Base complexity

    const decisionPoints = this.getDecisionPoints(language)
    
    for (const point of decisionPoints) {
      const matches = code.match(new RegExp('\\b' + point + '\\b', 'gi')) || []
      complexity += matches.length
    }

    return complexity
  }

  private calculateCognitiveComplexity(code: string, language: CodeLanguage): number {
    let complexity = 0
    let nestingLevel = 0
    const lines = code.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Increment nesting for blocks
      if (this.isBlockStart(trimmedLine, language)) {
        nestingLevel++
      }
      
      // Add complexity for decision points with nesting multiplier
      if (this.isDecisionPoint(trimmedLine, language)) {
        complexity += 1 + nestingLevel
      }
      
      // Decrement nesting for block ends
      if (this.isBlockEnd(trimmedLine, language)) {
        nestingLevel = Math.max(0, nestingLevel - 1)
      }
    }

    return complexity
  }

  private calculateNestingDepth(code: string, language: CodeLanguage): number {
    let maxDepth = 0
    let currentDepth = 0
    const lines = code.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (this.isBlockStart(trimmedLine, language)) {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
      }
      
      if (this.isBlockEnd(trimmedLine, language)) {
        currentDepth = Math.max(0, currentDepth - 1)
      }
    }

    return maxDepth
  }

  private countVariables(line: string, language: CodeLanguage): number {
    let count = 0
    
    switch (language) {
      case 'ampscript':
        count += (line.match(/@\w+/g) || []).length
        break
      case 'ssjs':
      case 'javascript':
        count += (line.match(/\bvar\s+\w+/g) || []).length
        count += (line.match(/\blet\s+\w+/g) || []).length
        count += (line.match(/\bconst\s+\w+/g) || []).length
        break
      case 'sql':
        count += (line.match(/DECLARE\s+@\w+/gi) || []).length
        break
    }
    
    return count
  }

  private countStringConcatenations(line: string, language: CodeLanguage): number {
    let count = 0
    
    switch (language) {
      case 'ampscript':
        count += (line.match(/Concat\(/gi) || []).length
        break
      case 'ssjs':
      case 'javascript':
        count += (line.match(/\+\s*["']/g) || []).length
        break
      case 'sql':
        count += (line.match(/\+\s*'/g) || []).length
        break
    }
    
    return count
  }

  private countArrayOperations(line: string, language: CodeLanguage): number {
    let count = 0
    
    switch (language) {
      case 'ssjs':
      case 'javascript':
        count += (line.match(/\.push\(|\.pop\(|\.shift\(|\.unshift\(/g) || []).length
        count += (line.match(/\[\s*\d+\s*\]/g) || []).length
        break
      case 'ampscript':
        count += (line.match(/LookupRows\(|Row\(/gi) || []).length
        break
    }
    
    return count
  }

  private estimateMemoryFromOperations(variables: number, strings: number, arrays: number, language: CodeLanguage): number {
    // Base memory per operation type (in KB)
    const variableMemory = variables * 0.1
    const stringMemory = strings * 0.5
    const arrayMemory = arrays * 1.0
    
    // Language-specific multipliers
    const languageMultiplier = this.getMemoryMultiplier(language)
    
    return (variableMemory + stringMemory + arrayMemory) * languageMultiplier
  }

  private getBaseTimePerLine(language: CodeLanguage): number {
    switch (language) {
      case 'ampscript': return 2.0 // AMPScript is interpreted and slower
      case 'ssjs': return 1.5 // Server-side JavaScript
      case 'sql': return 0.5 // SQL is optimized for data operations
      case 'javascript': return 1.0 // Client-side JavaScript
      case 'html': return 0.1 // Static markup
      case 'css': return 0.1 // Static styles
      default: return 1.0
    }
  }

  private getAPICallOverhead(language: CodeLanguage): number {
    switch (language) {
      case 'ampscript': return 100 // High overhead for SFMC API calls
      case 'ssjs': return 80 // Moderate overhead
      case 'sql': return 20 // Database operations are optimized
      default: return 50
    }
  }

  private getDecisionPoints(language: CodeLanguage): string[] {
    switch (language) {
      case 'ampscript':
        return ['IF', 'ELSEIF', 'FOR', 'WHILE', 'DO']
      case 'ssjs':
      case 'javascript':
        return ['if', 'else if', 'for', 'while', 'do', 'switch', 'case', '\\?', '&&', '\\|\\|']
      case 'sql':
        return ['CASE', 'WHEN', 'WHERE', 'HAVING', 'JOIN']
      default:
        return ['if', 'for', 'while']
    }
  }

  private isLoopStart(line: string, language: CodeLanguage): boolean {
    switch (language) {
      case 'ampscript':
        return /\b(FOR|WHILE|DO)\b/i.test(line)
      case 'ssjs':
      case 'javascript':
        return /\b(for|while|do)\s*\(/i.test(line)
      case 'sql':
        return false // SQL doesn't have traditional loops
      default:
        return /\b(for|while)\b/i.test(line)
    }
  }

  private isLoopEnd(line: string, language: CodeLanguage): boolean {
    switch (language) {
      case 'ampscript':
        return /\b(NEXT|ENDWHILE)\b/i.test(line)
      case 'ssjs':
      case 'javascript':
        return line.includes('}') // Simplified - would need proper parsing
      default:
        return line.includes('}')
    }
  }

  private isBlockStart(line: string, language: CodeLanguage): boolean {
    switch (language) {
      case 'ampscript':
        return /\b(IF|FOR|WHILE|DO)\b/i.test(line)
      case 'ssjs':
      case 'javascript':
        return /\{$/.test(line.trim()) || /\b(if|for|while|function)\s*\(/i.test(line)
      case 'sql':
        return /\b(BEGIN|CASE)\b/i.test(line)
      default:
        return line.includes('{')
    }
  }

  private isBlockEnd(line: string, language: CodeLanguage): boolean {
    switch (language) {
      case 'ampscript':
        return /\b(ENDIF|NEXT|ENDWHILE)\b/i.test(line)
      case 'ssjs':
      case 'javascript':
        return line.trim() === '}'
      case 'sql':
        return /\b(END)\b/i.test(line)
      default:
        return line.includes('}')
    }
  }

  private isDecisionPoint(line: string, language: CodeLanguage): boolean {
    const decisionPoints = this.getDecisionPoints(language)
    return decisionPoints.some(point => new RegExp('\\b' + point + '\\b', 'i').test(line))
  }

  private getLanguageSpecificRecommendations(code: string, language: CodeLanguage): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []

    switch (language) {
      case 'ampscript':
        if (code.includes('Lookup(') && code.includes('FOR')) {
          recommendations.push({
            type: 'optimization',
            message: 'Consider using LookupRows() instead of Lookup() in loops for better performance.',
            impact: 'high'
          })
        }
        break
        
      case 'ssjs':
        if (code.includes('DataExtension.Init(') && code.includes('for(')) {
          recommendations.push({
            type: 'optimization',
            message: 'Initialize DataExtension objects outside loops to improve performance.',
            impact: 'medium'
          })
        }
        break
        
      case 'sql':
        if (code.includes('SELECT *')) {
          recommendations.push({
            type: 'optimization',
            message: 'Specify column names instead of SELECT * for better performance.',
            impact: 'medium'
          })
        }
        break
    }

    return recommendations
  }

  private getMemoryMultiplier(language: CodeLanguage): number {
    switch (language) {
      case 'ampscript': return 1.5 // Higher memory usage due to interpretation
      case 'ssjs': return 1.2 // Moderate memory usage
      case 'sql': return 0.8 // Optimized memory usage
      default: return 1.0
    }
  }
}