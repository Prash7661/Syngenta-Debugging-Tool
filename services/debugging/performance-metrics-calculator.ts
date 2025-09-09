import { 
  CodeLanguage, 
  PerformanceMetrics, 
  ComplexityMetrics, 
  MemoryMetrics, 
  PerformanceRecommendation 
} from '../../types/debugging'

export class PerformanceMetricsCalculator {
  /**
   * Calculates comprehensive performance metrics for code
   */
  async calculateMetrics(code: string, language: CodeLanguage): Promise<PerformanceMetrics> {
    const startTime = performance.now()
    
    const [complexity, memoryUsage, apiCallCount, loopComplexity] = await Promise.all([
      this.calculateComplexityMetrics(code, language),
      this.calculateMemoryMetrics(code, language),
      this.countApiCalls(code, language),
      this.calculateLoopComplexity(code, language)
    ])

    const calculationTime = performance.now() - startTime
    const estimatedExecutionTime = this.estimateExecutionTime(code, language, complexity, apiCallCount, loopComplexity)
    const recommendations = this.generateRecommendations(complexity, memoryUsage, apiCallCount, loopComplexity, calculationTime)

    return {
      complexity,
      estimatedExecutionTime,
      memoryUsage,
      apiCallCount,
      loopComplexity,
      recommendations
    }
  }

  /**
   * Calculates code complexity metrics
   */
  private async calculateComplexityMetrics(code: string, language: CodeLanguage): Promise<ComplexityMetrics> {
    const lines = code.split('\n').filter(line => line.trim().length > 0)
    const linesOfCode = lines.length

    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(code, language),
      cognitiveComplexity: this.calculateCognitiveComplexity(code, language),
      nestingDepth: this.calculateNestingDepth(code, language),
      linesOfCode
    }
  }

  /**
   * Calculates cyclomatic complexity
   */
  private calculateCyclomaticComplexity(code: string, language: CodeLanguage): number {
    let complexity = 1 // Base complexity

    const patterns = this.getComplexityPatterns(language)
    
    for (const pattern of patterns) {
      const matches = code.match(pattern.regex)
      if (matches) {
        complexity += matches.length * pattern.weight
      }
    }

    return complexity
  }

  /**
   * Calculates cognitive complexity (how hard code is to understand)
   */
  private calculateCognitiveComplexity(code: string, language: CodeLanguage): number {
    let complexity = 0
    let nestingLevel = 0

    const lines = code.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Increment nesting for control structures
      if (this.isControlStructureStart(trimmedLine, language)) {
        nestingLevel++
        complexity += nestingLevel // Nested structures add more complexity
      }
      
      // Decrement nesting for closing braces/keywords
      if (this.isControlStructureEnd(trimmedLine, language)) {
        nestingLevel = Math.max(0, nestingLevel - 1)
      }
      
      // Add complexity for logical operators
      const logicalOperators = (trimmedLine.match(/&&|\|\||and|or/g) || []).length
      complexity += logicalOperators
    }

    return complexity
  }

  /**
   * Calculates maximum nesting depth
   */
  private calculateNestingDepth(code: string, language: CodeLanguage): number {
    let maxDepth = 0
    let currentDepth = 0

    const lines = code.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (this.isControlStructureStart(trimmedLine, language)) {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
      }
      
      if (this.isControlStructureEnd(trimmedLine, language)) {
        currentDepth = Math.max(0, currentDepth - 1)
      }
    }

    return maxDepth
  }

  /**
   * Calculates memory usage metrics
   */
  private async calculateMemoryMetrics(code: string, language: CodeLanguage): Promise<MemoryMetrics> {
    const variableCount = this.countVariables(code, language)
    const stringConcatenations = this.countStringConcatenations(code, language)
    const arrayOperations = this.countArrayOperations(code, language)
    
    // Estimate memory usage based on code patterns
    const baseMemory = 1024 // 1KB base
    const variableMemory = variableCount * 64 // 64 bytes per variable estimate
    const stringMemory = stringConcatenations * 256 // 256 bytes per concatenation
    const arrayMemory = arrayOperations * 512 // 512 bytes per array operation

    const estimatedMemoryUsage = baseMemory + variableMemory + stringMemory + arrayMemory

    return {
      estimatedMemoryUsage,
      variableCount,
      stringConcatenations,
      arrayOperations
    }
  }

  /**
   * Counts API calls in the code
   */
  private async countApiCalls(code: string, language: CodeLanguage): Promise<number> {
    const apiPatterns = this.getApiCallPatterns(language)
    let count = 0

    for (const pattern of apiPatterns) {
      const matches = code.match(pattern)
      if (matches) {
        count += matches.length
      }
    }

    return count
  }

  /**
   * Calculates loop complexity
   */
  private async calculateLoopComplexity(code: string, language: CodeLanguage): Promise<number> {
    const loopPatterns = this.getLoopPatterns(language)
    let complexity = 0

    for (const pattern of loopPatterns) {
      const matches = code.match(pattern.regex)
      if (matches) {
        complexity += matches.length * pattern.weight
      }
    }

    return complexity
  }

  /**
   * Estimates execution time based on various factors
   */
  private estimateExecutionTime(
    code: string, 
    language: CodeLanguage, 
    complexity: ComplexityMetrics, 
    apiCallCount: number, 
    loopComplexity: number
  ): number {
    const baseTime = this.getBaseExecutionTime(language)
    
    // Apply multipliers based on complexity factors
    const complexityMultiplier = 1 + (complexity.cyclomaticComplexity * 0.1)
    const nestingMultiplier = 1 + (complexity.nestingDepth * 0.15)
    const loopMultiplier = 1 + (loopComplexity * 0.3)
    const apiMultiplier = 1 + (apiCallCount * 0.5)
    const locMultiplier = 1 + (complexity.linesOfCode * 0.01)

    return baseTime * complexityMultiplier * nestingMultiplier * loopMultiplier * apiMultiplier * locMultiplier
  }

  /**
   * Generates performance recommendations
   */
  private generateRecommendations(
    complexity: ComplexityMetrics,
    memoryUsage: MemoryMetrics,
    apiCallCount: number,
    loopComplexity: number,
    calculationTime: number
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []

    // Complexity recommendations
    if (complexity.cyclomaticComplexity > 10) {
      recommendations.push({
        type: 'refactoring',
        message: `High cyclomatic complexity (${complexity.cyclomaticComplexity}). Consider breaking down into smaller functions.`,
        impact: 'high'
      })
    }

    if (complexity.nestingDepth > 4) {
      recommendations.push({
        type: 'refactoring',
        message: `Deep nesting detected (${complexity.nestingDepth} levels). Consider extracting nested logic into separate functions.`,
        impact: 'medium'
      })
    }

    // Memory recommendations
    if (memoryUsage.stringConcatenations > 10) {
      recommendations.push({
        type: 'optimization',
        message: `Multiple string concatenations detected (${memoryUsage.stringConcatenations}). Consider using string builders or templates.`,
        impact: 'medium'
      })
    }

    if (memoryUsage.estimatedMemoryUsage > 10240) { // 10KB
      recommendations.push({
        type: 'optimization',
        message: `High estimated memory usage (${Math.round(memoryUsage.estimatedMemoryUsage / 1024)}KB). Review variable usage and data structures.`,
        impact: 'high'
      })
    }

    // API call recommendations
    if (apiCallCount > 5) {
      recommendations.push({
        type: 'caching',
        message: `Multiple API calls detected (${apiCallCount}). Consider caching results or batching requests.`,
        impact: 'high'
      })
    }

    // Loop complexity recommendations
    if (loopComplexity > 5) {
      recommendations.push({
        type: 'optimization',
        message: `Complex loop structures detected. Consider optimizing loop logic or using more efficient algorithms.`,
        impact: 'medium'
      })
    }

    return recommendations
  }

  /**
   * Gets complexity patterns for different languages
   */
  private getComplexityPatterns(language: CodeLanguage): Array<{ regex: RegExp, weight: number }> {
    const commonPatterns = [
      { regex: /\bif\b/g, weight: 1 },
      { regex: /\belse\b/g, weight: 1 },
      { regex: /\bwhile\b/g, weight: 1 },
      { regex: /\bfor\b/g, weight: 1 },
      { regex: /\bswitch\b/g, weight: 1 },
      { regex: /\bcase\b/g, weight: 1 },
      { regex: /\bcatch\b/g, weight: 1 },
      { regex: /&&|\|\|/g, weight: 1 }
    ]

    const languageSpecific: Record<CodeLanguage, Array<{ regex: RegExp, weight: number }>> = {
      'ampscript': [
        ...commonPatterns,
        { regex: /\bIF\b/gi, weight: 1 },
        { regex: /\bELSE\b/gi, weight: 1 },
        { regex: /\bFOR\b/gi, weight: 1 }
      ],
      'ssjs': commonPatterns,
      'javascript': commonPatterns,
      'sql': [
        { regex: /\bCASE\b/gi, weight: 1 },
        { regex: /\bWHEN\b/gi, weight: 1 },
        { regex: /\bUNION\b/gi, weight: 1 },
        { regex: /\bJOIN\b/gi, weight: 0.5 }
      ],
      'html': [
        { regex: /<script/gi, weight: 2 },
        { regex: /<style/gi, weight: 1 }
      ],
      'css': [
        { regex: /@media/gi, weight: 1 },
        { regex: /:hover|:focus|:active/gi, weight: 0.5 }
      ]
    }

    return languageSpecific[language] || commonPatterns
  }

  /**
   * Gets API call patterns for different languages
   */
  private getApiCallPatterns(language: CodeLanguage): RegExp[] {
    const patterns: Record<CodeLanguage, RegExp[]> = {
      'ampscript': [
        /HTTPGet\s*\(/gi,
        /HTTPPost\s*\(/gi,
        /RetrieveSalesforceObjects\s*\(/gi,
        /UpdateSingleSalesforceObject\s*\(/gi
      ],
      'ssjs': [
        /Platform\.Request\./gi,
        /Platform\.Response\./gi,
        /HTTP\.Get\s*\(/gi,
        /HTTP\.Post\s*\(/gi
      ],
      'javascript': [
        /fetch\s*\(/gi,
        /XMLHttpRequest/gi,
        /axios\./gi,
        /\$\.ajax/gi,
        /\$\.get/gi,
        /\$\.post/gi
      ],
      'sql': [
        /INSERT\s+INTO/gi,
        /UPDATE\s+/gi,
        /DELETE\s+FROM/gi,
        /SELECT\s+/gi
      ],
      'html': [],
      'css': []
    }

    return patterns[language] || []
  }

  /**
   * Gets loop patterns for different languages
   */
  private getLoopPatterns(language: CodeLanguage): Array<{ regex: RegExp, weight: number }> {
    const patterns: Record<CodeLanguage, Array<{ regex: RegExp, weight: number }>> = {
      'ampscript': [
        { regex: /\bFOR\b/gi, weight: 2 },
        { regex: /\bNEXT\b/gi, weight: 1 }
      ],
      'ssjs': [
        { regex: /\bfor\s*\(/gi, weight: 2 },
        { regex: /\bwhile\s*\(/gi, weight: 2 },
        { regex: /\.forEach\s*\(/gi, weight: 1 },
        { regex: /\.map\s*\(/gi, weight: 1 }
      ],
      'javascript': [
        { regex: /\bfor\s*\(/gi, weight: 2 },
        { regex: /\bwhile\s*\(/gi, weight: 2 },
        { regex: /\.forEach\s*\(/gi, weight: 1 },
        { regex: /\.map\s*\(/gi, weight: 1 },
        { regex: /\.filter\s*\(/gi, weight: 1 }
      ],
      'sql': [
        { regex: /\bWHILE\b/gi, weight: 3 },
        { regex: /\bCURSOR\b/gi, weight: 4 }
      ],
      'html': [],
      'css': []
    }

    return patterns[language] || []
  }

  private countVariables(code: string, language: CodeLanguage): number {
    const patterns: Record<CodeLanguage, RegExp[]> = {
      'ampscript': [
        /SET\s+@\w+/gi,
        /VAR\s+@\w+/gi
      ],
      'ssjs': [
        /\bvar\s+\w+/gi,
        /\blet\s+\w+/gi,
        /\bconst\s+\w+/gi
      ],
      'javascript': [
        /\bvar\s+\w+/gi,
        /\blet\s+\w+/gi,
        /\bconst\s+\w+/gi
      ],
      'sql': [
        /DECLARE\s+@\w+/gi,
        /SET\s+@\w+/gi
      ],
      'html': [],
      'css': [
        /--[\w-]+:/gi // CSS custom properties
      ]
    }

    let count = 0
    const languagePatterns = patterns[language] || []
    
    for (const pattern of languagePatterns) {
      const matches = code.match(pattern)
      if (matches) {
        count += matches.length
      }
    }

    return count
  }

  private countStringConcatenations(code: string, language: CodeLanguage): number {
    const patterns: Record<CodeLanguage, RegExp[]> = {
      'ampscript': [
        /CONCAT\s*\(/gi,
        /\+\s*["']/g
      ],
      'ssjs': [
        /\+\s*["']/g,
        /`[^`]*\$\{/g // Template literals
      ],
      'javascript': [
        /\+\s*["']/g,
        /`[^`]*\$\{/g // Template literals
      ],
      'sql': [
        /\+\s*'/g,
        /CONCAT\s*\(/gi
      ],
      'html': [],
      'css': []
    }

    let count = 0
    const languagePatterns = patterns[language] || []
    
    for (const pattern of languagePatterns) {
      const matches = code.match(pattern)
      if (matches) {
        count += matches.length
      }
    }

    return count
  }

  private countArrayOperations(code: string, language: CodeLanguage): number {
    const patterns: Record<CodeLanguage, RegExp[]> = {
      'ampscript': [
        /BuildRowsetFromString\s*\(/gi,
        /RowCount\s*\(/gi
      ],
      'ssjs': [
        /\.push\s*\(/gi,
        /\.pop\s*\(/gi,
        /\.splice\s*\(/gi,
        /\.slice\s*\(/gi,
        /\.sort\s*\(/gi
      ],
      'javascript': [
        /\.push\s*\(/gi,
        /\.pop\s*\(/gi,
        /\.splice\s*\(/gi,
        /\.slice\s*\(/gi,
        /\.sort\s*\(/gi,
        /\.filter\s*\(/gi,
        /\.map\s*\(/gi
      ],
      'sql': [
        /ARRAY_AGG\s*\(/gi,
        /STRING_AGG\s*\(/gi
      ],
      'html': [],
      'css': []
    }

    let count = 0
    const languagePatterns = patterns[language] || []
    
    for (const pattern of languagePatterns) {
      const matches = code.match(pattern)
      if (matches) {
        count += matches.length
      }
    }

    return count
  }

  private isControlStructureStart(line: string, language: CodeLanguage): boolean {
    const patterns: Record<CodeLanguage, RegExp[]> = {
      'ampscript': [
        /\bIF\b/i,
        /\bFOR\b/i
      ],
      'ssjs': [
        /\bif\s*\(/,
        /\bfor\s*\(/,
        /\bwhile\s*\(/,
        /\bswitch\s*\(/,
        /\btry\s*\{/,
        /\{$/
      ],
      'javascript': [
        /\bif\s*\(/,
        /\bfor\s*\(/,
        /\bwhile\s*\(/,
        /\bswitch\s*\(/,
        /\btry\s*\{/,
        /\{$/
      ],
      'sql': [
        /\bBEGIN\b/i,
        /\bCASE\b/i
      ],
      'html': [
        /<script/i,
        /<style/i
      ],
      'css': [
        /@media/i,
        /\{$/
      ]
    }

    const languagePatterns = patterns[language] || []
    return languagePatterns.some(pattern => pattern.test(line))
  }

  private isControlStructureEnd(line: string, language: CodeLanguage): boolean {
    const patterns: Record<CodeLanguage, RegExp[]> = {
      'ampscript': [
        /\bENDIF\b/i,
        /\bNEXT\b/i
      ],
      'ssjs': [
        /^\s*\}$/,
        /\belse\b/,
        /\bcatch\b/,
        /\bfinally\b/
      ],
      'javascript': [
        /^\s*\}$/,
        /\belse\b/,
        /\bcatch\b/,
        /\bfinally\b/
      ],
      'sql': [
        /\bEND\b/i
      ],
      'html': [
        /<\/script>/i,
        /<\/style>/i
      ],
      'css': [
        /^\s*\}$/
      ]
    }

    const languagePatterns = patterns[language] || []
    return languagePatterns.some(pattern => pattern.test(line))
  }

  private getBaseExecutionTime(language: CodeLanguage): number {
    const baseTimes: Record<CodeLanguage, number> = {
      'ampscript': 50,
      'ssjs': 20,
      'sql': 100,
      'html': 5,
      'css': 10,
      'javascript': 15
    }

    return baseTimes[language] || 25
  }
}