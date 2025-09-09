import { ValidationResult, ValidationError, ValidationWarning, ValidationSuggestion } from './language-validators'

export class SSJSValidator {
  private readonly SFMC_OBJECTS = [
    'Platform', 'DataExtension', 'HTTP', 'WSProxy', 'Variable', 'Request', 'Response',
    'Script', 'Guid', 'Now', 'Write', 'Add', 'Stringify'
  ]

  private readonly PLATFORM_METHODS = [
    'Platform.Load', 'Platform.Function.ParseJSON', 'Platform.Function.Stringify',
    'Platform.Request.GetRequestHeader', 'Platform.Request.GetFormField',
    'Platform.Request.GetQueryStringParameter', 'Platform.Response.SetResponseHeader',
    'Platform.Response.Redirect', 'Platform.Response.SetStatusCode'
  ]

  async validate(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []

    // Split code into lines for analysis
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check syntax
      this.validateSyntax(line, lineNumber, errors)
      
      // Check best practices
      this.checkBestPractices(line, lineNumber, warnings, suggestions)
      
      // Check security
      this.checkSecurity(line, lineNumber, errors, warnings)
      
      // Check performance
      this.checkPerformance(line, lineNumber, warnings, suggestions)
    }

    // Global validations
    this.validateGlobalStructure(code, errors, warnings, suggestions)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  private validateSyntax(line: string, lineNumber: number, errors: ValidationError[]): void {
    // Check for proper SSJS script tags
    if (line.trim().startsWith('<script') && !line.includes('runat="server"')) {
      errors.push({
        line: lineNumber,
        message: 'SSJS script tags must include runat="server" attribute.',
        rule: 'ssjs-script-tag',
        severity: 'error'
      })
    }

    // Check for proper variable declarations
    const varDeclarations = line.match(/\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)
    if (varDeclarations) {
      varDeclarations.forEach(declaration => {
        const varName = declaration.split(/\s+/)[1]
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(varName)) {
          errors.push({
            line: lineNumber,
            message: `Invalid variable name: ${varName}`,
            rule: 'ssjs-variable-name',
            severity: 'error'
          })
        }
      })
    }

    // Check for missing semicolons (basic check)
    if (line.trim().length > 0 && 
        !line.trim().endsWith(';') && 
        !line.trim().endsWith('{') && 
        !line.trim().endsWith('}') &&
        !line.includes('//') &&
        !line.includes('/*') &&
        !line.includes('*/') &&
        !/^\s*(if|else|for|while|function|try|catch|finally)\b/.test(line.trim())) {
      warnings.push({
        line: lineNumber,
        message: 'Consider adding semicolon at end of statement.',
        rule: 'ssjs-semicolon'
      })
    }

    // Check for undefined SFMC objects/methods
    const objectCalls = line.match(/\b([A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)*)\s*[\.\(]/g)
    if (objectCalls) {
      objectCalls.forEach(call => {
        const objectName = call.replace(/[\.\(].*$/, '')
        if (!this.SFMC_OBJECTS.some(obj => objectName.startsWith(obj)) &&
            !this.PLATFORM_METHODS.some(method => call.startsWith(method))) {
          warnings.push({
            line: lineNumber,
            message: `Unknown SFMC object or method: ${objectName}`,
            rule: 'ssjs-unknown-object'
          })
        }
      })
    }
  }

  private checkBestPractices(
    line: string, 
    lineNumber: number, 
    warnings: ValidationWarning[], 
    suggestions: ValidationSuggestion[]
  ): void {
    // Check for Platform.Load usage
    if (line.includes('DataExtension') && !line.includes('Platform.Load')) {
      const hasLoad = line.includes('Platform.Load("Core"')
      if (!hasLoad) {
        warnings.push({
          line: lineNumber,
          message: 'Consider loading Core library with Platform.Load("Core", "1") before using DataExtension.',
          rule: 'ssjs-platform-load'
        })
      }
    }

    // Check for proper error handling
    if ((line.includes('HTTP.') || line.includes('WSProxy') || line.includes('DataExtension')) && 
        !line.includes('try') && !line.includes('catch')) {
      suggestions.push({
        message: 'Consider wrapping API calls in try-catch blocks for proper error handling.',
        type: 'best_practice'
      })
    }

    // Check for proper logging
    if (line.includes('catch') && !line.includes('Write')) {
      suggestions.push({
        message: 'Consider adding logging in catch blocks using Write() for debugging.',
        type: 'best_practice'
      })
    }

    // Check for variable naming conventions
    const variables = line.match(/\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)
    if (variables) {
      variables.forEach(variable => {
        const varName = variable.replace('var ', '')
        if (!/^[a-z][a-zA-Z0-9]*$/.test(varName) && varName !== varName.toUpperCase()) {
          warnings.push({
            line: lineNumber,
            message: `Variable '${varName}' should use camelCase naming convention.`,
            rule: 'ssjs-variable-naming'
          })
        }
      })
    }

    // Check for magic numbers
    if (line.match(/\b\d{3,}\b/) && !line.includes('//')) {
      suggestions.push({
        message: 'Consider using named constants instead of magic numbers.',
        type: 'maintainability'
      })
    }
  }

  private checkSecurity(
    line: string, 
    lineNumber: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Check for eval usage
    if (line.includes('eval(')) {
      errors.push({
        line: lineNumber,
        message: 'Avoid using eval() as it can lead to security vulnerabilities.',
        rule: 'ssjs-no-eval',
        severity: 'error'
      })
    }

    // Check for direct request parameter usage without validation
    if (line.includes('Request.') && !line.includes('validation') && !line.includes('sanitize')) {
      warnings.push({
        line: lineNumber,
        message: 'Validate and sanitize request parameters to prevent injection attacks.',
        rule: 'ssjs-input-validation'
      })
    }

    // Check for sensitive data in logs
    if (line.includes('Write(') && line.match(/(password|secret|key|token)/i)) {
      warnings.push({
        line: lineNumber,
        message: 'Avoid logging sensitive data.',
        rule: 'ssjs-sensitive-logging'
      })
    }

    // Check for SQL injection in dynamic queries
    if (line.includes('DataExtension') && line.includes('+') && line.includes('Request.')) {
      errors.push({
        line: lineNumber,
        message: 'Potential SQL injection vulnerability. Use parameterized queries.',
        rule: 'ssjs-sql-injection',
        severity: 'error'
      })
    }
  }

  private checkPerformance(
    line: string, 
    lineNumber: number, 
    warnings: ValidationWarning[], 
    suggestions: ValidationSuggestion[]
  ): void {
    // Check for inefficient loops
    if (line.includes('for') && line.includes('DataExtension')) {
      suggestions.push({
        message: 'Consider batch operations instead of individual DataExtension calls in loops.',
        type: 'performance'
      })
    }

    // Check for synchronous HTTP calls in loops
    if (line.includes('HTTP.') && (line.includes('for') || line.includes('while'))) {
      warnings.push({
        line: lineNumber,
        message: 'HTTP calls in loops can cause performance issues. Consider batch processing.',
        rule: 'ssjs-http-loop-performance'
      })
    }

    // Check for inefficient string concatenation
    if (line.match(/\+.*\+.*\+/)) {
      suggestions.push({
        message: 'For multiple string concatenations, consider using an array and join() method.',
        type: 'performance'
      })
    }

    // Check for repeated object initialization
    if (line.includes('DataExtension.Init') || line.includes('WSProxy')) {
      suggestions.push({
        message: 'Consider reusing initialized objects when possible to improve performance.',
        type: 'performance'
      })
    }
  }

  private validateGlobalStructure(
    code: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    suggestions: ValidationSuggestion[]
  ): void {
    // Check for proper script structure
    if (!code.includes('<script') && !code.includes('Platform.Load')) {
      warnings.push({
        message: 'SSJS code should be wrapped in proper script tags or include Platform.Load.',
        rule: 'ssjs-structure'
      })
    }

    // Check for error handling coverage
    const tryBlocks = (code.match(/try\s*{/g) || []).length
    const apiCalls = (code.match(/(HTTP\.|WSProxy|DataExtension)/g) || []).length
    
    if (apiCalls > 0 && tryBlocks === 0) {
      suggestions.push({
        message: 'Add error handling for API calls to improve reliability.',
        type: 'best_practice'
      })
    }

    // Check for proper variable scoping
    if (code.includes('var ') && code.length > 500) {
      suggestions.push({
        message: 'Consider using proper variable scoping and avoiding global variables in large scripts.',
        type: 'maintainability'
      })
    }

    // Check for proper commenting
    const commentLines = (code.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || []).length
    const codeLines = code.split('\n').filter(line => line.trim().length > 0).length
    
    if (codeLines > 20 && commentLines < codeLines * 0.1) {
      suggestions.push({
        message: 'Add more comments to explain complex SSJS logic.',
        type: 'maintainability'
      })
    }

    // Check for proper resource cleanup
    if (code.includes('HTTP.') && !code.includes('finally')) {
      suggestions.push({
        message: 'Consider using finally blocks to ensure proper resource cleanup.',
        type: 'best_practice'
      })
    }
  }
}