import { BestPracticeViolation, CodeLanguage, ErrorSeverity, BestPracticeCategory } from '../../../types/debugging'
import { BestPracticesEnforcer } from '../best-practices-enforcer'

export class BestPracticesAnalyzer {
  private enforcer: BestPracticesEnforcer

  constructor() {
    this.enforcer = new BestPracticesEnforcer()
  }

  async analyze(code: string, language: CodeLanguage): Promise<BestPracticeViolation[]> {
    // Use the new rule-based enforcer for comprehensive analysis
    const ruleBasedViolations = await this.enforcer.enforceRules(code, language)
    
    // Combine with legacy analysis for additional checks
    const legacyViolations = await this.performLegacyAnalysis(code, language)
    
    // Merge and deduplicate violations
    const allViolations = [...ruleBasedViolations, ...legacyViolations]
    return this.deduplicateViolations(allViolations)
  }

  private async performLegacyAnalysis(code: string, language: CodeLanguage): Promise<BestPracticeViolation[]> {
    const violations: BestPracticeViolation[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Analyze naming conventions
      violations.push(...this.analyzeNamingConventions(line, lineNumber, language))
      
      // Analyze code structure
      violations.push(...this.analyzeCodeStructure(line, lineNumber, language))
      
      // Analyze security practices
      violations.push(...this.analyzeSecurityPractices(line, lineNumber, language))
      
      // Analyze error handling
      violations.push(...this.analyzeErrorHandling(line, lineNumber, language))
      
      // Analyze documentation
      violations.push(...this.analyzeDocumentation(line, lineNumber, language))
      
      // Analyze maintainability
      violations.push(...this.analyzeMaintainability(line, lineNumber, language))
    }

    // Analyze overall code structure
    violations.push(...this.analyzeOverallStructure(code, language))

    return violations
  }

  private deduplicateViolations(violations: BestPracticeViolation[]): BestPracticeViolation[] {
    const seen = new Set<string>()
    return violations.filter(violation => {
      const key = `${violation.rule}_${violation.line}_${violation.column || 0}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private analyzeNamingConventions(line: string, lineNumber: number, language: CodeLanguage): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    switch (language) {
      case 'ampscript':
        violations.push(...this.analyzeAMPScriptNaming(line, lineNumber))
        break
      case 'ssjs':
      case 'javascript':
        violations.push(...this.analyzeJavaScriptNaming(line, lineNumber))
        break
      case 'sql':
        violations.push(...this.analyzeSQLNaming(line, lineNumber))
        break
    }

    return violations
  }

  private analyzeCodeStructure(line: string, lineNumber: number, language: CodeLanguage): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check line length
    if (line.length > 120) {
      violations.push({
        id: `long_line_${lineNumber}`,
        rule: 'line-length',
        category: 'structure' as BestPracticeCategory,
        severity: 'warning' as ErrorSeverity,
        message: 'Line exceeds recommended length of 120 characters',
        line: lineNumber,
        suggestion: 'Break long lines into multiple lines for better readability',
        documentation: 'Long lines can be difficult to read and maintain'
      })
    }

    // Check for deep nesting
    const indentLevel = this.getIndentLevel(line)
    if (indentLevel > 4) {
      violations.push({
        id: `deep_nesting_${lineNumber}`,
        rule: 'nesting-depth',
        category: 'structure' as BestPracticeCategory,
        severity: 'warning' as ErrorSeverity,
        message: 'Deep nesting detected - consider extracting to functions',
        line: lineNumber,
        suggestion: 'Extract nested logic into separate functions',
        documentation: 'Deep nesting makes code harder to understand and maintain'
      })
    }

    return violations
  }

  private analyzeSecurityPractices(line: string, lineNumber: number, language: CodeLanguage): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check for potential SQL injection
    if (language === 'sql' && line.includes("'") && line.includes('+')) {
      violations.push({
        id: `sql_injection_risk_${lineNumber}`,
        rule: 'sql-injection-prevention',
        category: 'security' as BestPracticeCategory,
        severity: 'error' as ErrorSeverity,
        message: 'Potential SQL injection vulnerability detected',
        line: lineNumber,
        suggestion: 'Use parameterized queries instead of string concatenation',
        documentation: 'String concatenation in SQL can lead to injection attacks'
      })
    }

    // Check for hardcoded credentials
    const credentialPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /apikey\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i
    ]

    credentialPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        violations.push({
          id: `hardcoded_credential_${lineNumber}`,
          rule: 'no-hardcoded-credentials',
          category: 'security' as BestPracticeCategory,
          severity: 'error' as ErrorSeverity,
          message: 'Hardcoded credentials detected',
          line: lineNumber,
          suggestion: 'Use environment variables or secure configuration for credentials',
          documentation: 'Hardcoded credentials pose a security risk'
        })
      }
    })

    return violations
  }

  private analyzeErrorHandling(line: string, lineNumber: number, language: CodeLanguage): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check for missing error handling around risky operations
    const riskyOperations = this.getRiskyOperations(language)
    
    riskyOperations.forEach(operation => {
      if (line.includes(operation)) {
        violations.push({
          id: `missing_error_handling_${lineNumber}`,
          rule: 'error-handling-required',
          category: 'error_handling' as BestPracticeCategory,
          severity: 'warning' as ErrorSeverity,
          message: `${operation} should include error handling`,
          line: lineNumber,
          suggestion: 'Wrap risky operations in try-catch blocks',
          documentation: 'Proper error handling improves application reliability'
        })
      }
    })

    return violations
  }

  private analyzeDocumentation(line: string, lineNumber: number, language: CodeLanguage): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check for function documentation
    if (this.isFunctionDeclaration(line, language) && !this.hasDocumentation(line)) {
      violations.push({
        id: `missing_function_docs_${lineNumber}`,
        rule: 'function-documentation',
        category: 'documentation' as BestPracticeCategory,
        severity: 'warning' as ErrorSeverity,
        message: 'Function lacks documentation',
        line: lineNumber,
        suggestion: 'Add documentation describing function purpose, parameters, and return value',
        documentation: 'Well-documented functions improve code maintainability'
      })
    }

    return violations
  }

  private analyzeMaintainability(line: string, lineNumber: number, language: CodeLanguage): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check for magic numbers
    const magicNumberPattern = /\b\d{2,}\b/g
    const matches = line.match(magicNumberPattern)
    if (matches && !line.includes('//') && !line.includes('/*')) {
      matches.forEach(match => {
        if (parseInt(match) > 10) { // Ignore small numbers
          violations.push({
            id: `magic_number_${lineNumber}_${match}`,
            rule: 'no-magic-numbers',
            category: 'maintainability' as BestPracticeCategory,
            severity: 'warning' as ErrorSeverity,
            message: `Magic number detected: ${match}`,
            line: lineNumber,
            suggestion: 'Replace magic numbers with named constants',
            documentation: 'Magic numbers make code harder to understand and maintain'
          })
        }
      })
    }

    // Check for TODO/FIXME comments
    if (line.includes('TODO') || line.includes('FIXME')) {
      violations.push({
        id: `todo_comment_${lineNumber}`,
        rule: 'todo-tracking',
        category: 'maintainability' as BestPracticeCategory,
        severity: 'info' as ErrorSeverity,
        message: 'TODO/FIXME comment found',
        line: lineNumber,
        suggestion: 'Track TODO items in issue management system',
        documentation: 'TODO comments should be tracked and resolved'
      })
    }

    return violations
  }

  private analyzeOverallStructure(code: string, language: CodeLanguage): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check for code duplication
    const duplicateLines = this.findDuplicateLines(code)
    if (duplicateLines.length > 0) {
      violations.push({
        id: 'code_duplication',
        rule: 'no-code-duplication',
        category: 'maintainability' as BestPracticeCategory,
        severity: 'warning' as ErrorSeverity,
        message: 'Code duplication detected',
        line: duplicateLines[0],
        suggestion: 'Extract duplicate code into reusable functions',
        documentation: 'Code duplication increases maintenance burden'
      })
    }

    // Check function length
    const functions = this.extractFunctions(code, language)
    functions.forEach(func => {
      if (func.lineCount > 50) {
        violations.push({
          id: `long_function_${func.startLine}`,
          rule: 'function-length',
          category: 'maintainability' as BestPracticeCategory,
          severity: 'warning' as ErrorSeverity,
          message: `Function is too long (${func.lineCount} lines)`,
          line: func.startLine,
          suggestion: 'Break large functions into smaller, focused functions',
          documentation: 'Large functions are harder to understand and test'
        })
      }
    })

    return violations
  }

  private analyzeAMPScriptNaming(line: string, lineNumber: number): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check variable naming conventions
    const varMatches = line.match(/@(\w+)/g)
    if (varMatches) {
      varMatches.forEach(varName => {
        const name = varName.substring(1) // Remove @
        if (name.length < 3) {
          violations.push({
            id: `short_variable_name_${lineNumber}_${name}`,
            rule: 'variable-naming',
            category: 'naming' as BestPracticeCategory,
            severity: 'warning' as ErrorSeverity,
            message: `Variable name '${varName}' is too short`,
            line: lineNumber,
            suggestion: 'Use descriptive variable names (at least 3 characters)',
            documentation: 'Descriptive names improve code readability'
          })
        }

        if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
          violations.push({
            id: `variable_naming_convention_${lineNumber}_${name}`,
            rule: 'variable-naming-convention',
            category: 'naming' as BestPracticeCategory,
            severity: 'warning' as ErrorSeverity,
            message: `Variable '${varName}' should use camelCase`,
            line: lineNumber,
            suggestion: 'Use camelCase for variable names',
            documentation: 'Consistent naming conventions improve code readability'
          })
        }
      })
    }

    return violations
  }

  private analyzeJavaScriptNaming(line: string, lineNumber: number): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check function naming
    const funcMatch = line.match(/function\s+(\w+)/i)
    if (funcMatch) {
      const funcName = funcMatch[1]
      if (!/^[a-z][a-zA-Z0-9]*$/.test(funcName)) {
        violations.push({
          id: `function_naming_${lineNumber}_${funcName}`,
          rule: 'function-naming-convention',
          category: 'naming' as BestPracticeCategory,
          severity: 'warning' as ErrorSeverity,
          message: `Function '${funcName}' should use camelCase`,
          line: lineNumber,
          suggestion: 'Use camelCase for function names',
          documentation: 'Consistent naming conventions improve code readability'
        })
      }
    }

    // Check variable declarations
    const varMatches = line.match(/(?:var|let|const)\s+(\w+)/g)
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.split(/\s+/)[1]
        if (varName.length < 3 && !['i', 'j', 'k'].includes(varName)) {
          violations.push({
            id: `short_variable_${lineNumber}_${varName}`,
            rule: 'variable-naming',
            category: 'naming' as BestPracticeCategory,
            severity: 'warning' as ErrorSeverity,
            message: `Variable '${varName}' is too short`,
            line: lineNumber,
            suggestion: 'Use descriptive variable names',
            documentation: 'Descriptive names improve code readability'
          })
        }
      })
    }

    return violations
  }

  private analyzeSQLNaming(line: string, lineNumber: number): BestPracticeViolation[] {
    const violations: BestPracticeViolation[] = []

    // Check table alias naming
    const aliasMatch = line.match(/(\w+)\s+(?:AS\s+)?(\w+)(?:\s|$|,)/gi)
    if (aliasMatch) {
      aliasMatch.forEach(match => {
        const parts = match.trim().split(/\s+/)
        if (parts.length >= 2) {
          const alias = parts[parts.length - 1]
          if (alias.length === 1) {
            violations.push({
              id: `short_alias_${lineNumber}_${alias}`,
              rule: 'table-alias-naming',
              category: 'naming' as BestPracticeCategory,
              severity: 'warning' as ErrorSeverity,
              message: `Table alias '${alias}' is too short`,
              line: lineNumber,
              suggestion: 'Use meaningful table aliases (2+ characters)',
              documentation: 'Meaningful aliases improve query readability'
            })
          }
        }
      })
    }

    return violations
  }

  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/)
    if (!match) return 0
    
    const whitespace = match[1]
    // Assume 2 spaces or 1 tab per indent level
    return Math.floor(whitespace.length / 2) + (whitespace.match(/\t/g) || []).length
  }

  private getRiskyOperations(language: CodeLanguage): string[] {
    switch (language) {
      case 'ampscript':
        return ['HTTPGet', 'HTTPPost', 'Lookup', 'InsertData', 'UpdateData', 'DeleteData']
      case 'ssjs':
        return ['WSProxy', 'HTTP.Get', 'HTTP.Post', 'DataExtension.Init']
      case 'sql':
        return ['INSERT', 'UPDATE', 'DELETE', 'DROP']
      case 'javascript':
        return ['fetch', 'XMLHttpRequest', 'eval']
      default:
        return []
    }
  }

  private isFunctionDeclaration(line: string, language: CodeLanguage): boolean {
    switch (language) {
      case 'ssjs':
      case 'javascript':
        return /function\s+\w+\s*\(/.test(line)
      case 'sql':
        return /CREATE\s+(FUNCTION|PROCEDURE)/i.test(line)
      default:
        return false
    }
  }

  private hasDocumentation(line: string): boolean {
    // Simple check for documentation comments
    return line.includes('/**') || line.includes('/*') || line.includes('//')
  }

  private findDuplicateLines(code: string): number[] {
    const lines = code.split('\n')
    const lineMap = new Map<string, number[]>()
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        if (!lineMap.has(trimmed)) {
          lineMap.set(trimmed, [])
        }
        lineMap.get(trimmed)!.push(index + 1)
      }
    })

    // Return line numbers of first occurrence of duplicated lines
    const duplicates: number[] = []
    lineMap.forEach((lineNumbers, content) => {
      if (lineNumbers.length > 1) {
        duplicates.push(lineNumbers[0])
      }
    })

    return duplicates
  }

  private extractFunctions(code: string, language: CodeLanguage): Array<{ startLine: number, lineCount: number }> {
    const functions: Array<{ startLine: number, lineCount: number }> = []
    const lines = code.split('\n')
    
    let currentFunction: { startLine: number, braceCount: number } | null = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1
      
      if (this.isFunctionDeclaration(line, language)) {
        currentFunction = { startLine: lineNumber, braceCount: 0 }
      }
      
      if (currentFunction) {
        currentFunction.braceCount += (line.match(/\{/g) || []).length
        currentFunction.braceCount -= (line.match(/\}/g) || []).length
        
        if (currentFunction.braceCount === 0 && line.includes('}')) {
          functions.push({
            startLine: currentFunction.startLine,
            lineCount: lineNumber - currentFunction.startLine + 1
          })
          currentFunction = null
        }
      }
    }
    
    return functions
  }
}