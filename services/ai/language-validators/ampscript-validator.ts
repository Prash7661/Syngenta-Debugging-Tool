import { ValidationResult, ValidationError, ValidationWarning, ValidationSuggestion } from './language-validators'

export class AMPScriptValidator {
  private readonly AMPSCRIPT_FUNCTIONS = [
    'Concat', 'Length', 'Substring', 'Replace', 'Trim', 'UpperCase', 'LowerCase',
    'ProperCase', 'IndexOf', 'RegExMatch', 'Base64Encode', 'Base64Decode',
    'Now', 'DateAdd', 'DateDiff', 'Format', 'FormatDate', 'SystemDateToLocalDate',
    'Add', 'Subtract', 'Multiply', 'Divide', 'Mod', 'Random',
    'Lookup', 'LookupRows', 'LookupOrderedRows', 'InsertData', 'UpdateData', 'DeleteData',
    'UpsertData', 'CreateSalesforceObject', 'UpdateSingleSalesforceObject',
    'IIF', 'IsNull', 'Empty', 'Field', 'AttributeValue', 'RequestParameter',
    'CloudPagesURL', 'RedirectTo', 'HTTPGet', 'HTTPPost',
    'PersonalizationString', 'TreatAsContent', 'ContentBlockByName', 'ContentBlockById',
    'EncryptSymmetric', 'DecryptSymmetric', 'MD5', 'SHA1', 'SHA256'
  ]

  async validate(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []

    // Split code into lines for line-by-line analysis
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for syntax errors
      this.validateSyntax(line, lineNumber, errors)
      
      // Check for best practices
      this.checkBestPractices(line, lineNumber, warnings, suggestions)
      
      // Check for security issues
      this.checkSecurity(line, lineNumber, errors, warnings)
      
      // Check for performance issues
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
    // Check for proper AMPScript delimiters
    const outputBlocks = line.match(/%%=.*?=%/g)
    const processingBlocks = line.match(/%%\[.*?\]%%/g)

    // Validate output blocks
    if (outputBlocks) {
      outputBlocks.forEach(block => {
        if (!block.startsWith('%%=') || !block.endsWith('=%%')) {
          errors.push({
            line: lineNumber,
            message: 'Invalid AMPScript output block syntax. Use %%=...=%% format.',
            rule: 'ampscript-output-syntax',
            severity: 'error'
          })
        }
      })
    }

    // Validate processing blocks
    if (processingBlocks) {
      processingBlocks.forEach(block => {
        if (!block.startsWith('%%[') || !block.endsWith(']%%')) {
          errors.push({
            line: lineNumber,
            message: 'Invalid AMPScript processing block syntax. Use %%[...]%% format.',
            rule: 'ampscript-processing-syntax',
            severity: 'error'
          })
        }
      })
    }

    // Check for unmatched delimiters
    const openDelimiters = (line.match(/%%=/g) || []).length + (line.match(/%%\[/g) || []).length
    const closeDelimiters = (line.match(/=%%/g) || []).length + (line.match(/\]%%/g) || []).length

    if (openDelimiters !== closeDelimiters) {
      errors.push({
        line: lineNumber,
        message: 'Unmatched AMPScript delimiters detected.',
        rule: 'ampscript-delimiter-mismatch',
        severity: 'error'
      })
    }

    // Check for invalid function names
    const functionCalls = line.match(/\b([A-Za-z][A-Za-z0-9]*)\s*\(/g)
    if (functionCalls) {
      functionCalls.forEach(call => {
        const functionName = call.replace(/\s*\($/, '')
        if (!this.AMPSCRIPT_FUNCTIONS.includes(functionName) && !this.isCustomFunction(functionName)) {
          errors.push({
            line: lineNumber,
            message: `Unknown AMPScript function: ${functionName}`,
            rule: 'ampscript-unknown-function',
            severity: 'error'
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
    // Check for TreatAsContent usage
    if (line.includes('ContentBlockBy') && !line.includes('TreatAsContent')) {
      warnings.push({
        line: lineNumber,
        message: 'Consider using TreatAsContent() when including dynamic content blocks.',
        rule: 'ampscript-treat-as-content'
      })
      
      suggestions.push({
        message: 'Use TreatAsContent() to safely include dynamic content that may contain AMPScript.',
        type: 'best_practice'
      })
    }

    // Check for proper variable naming
    const variables = line.match(/@[A-Za-z][A-Za-z0-9_]*/g)
    if (variables) {
      variables.forEach(variable => {
        if (variable.length < 3) {
          warnings.push({
            line: lineNumber,
            message: `Variable name '${variable}' is too short. Use descriptive names.`,
            rule: 'ampscript-variable-naming'
          })
        }
        
        if (!/^@[a-z][A-Za-z0-9_]*$/.test(variable)) {
          warnings.push({
            line: lineNumber,
            message: `Variable '${variable}' should use camelCase naming convention.`,
            rule: 'ampscript-variable-case'
          })
        }
      })
    }

    // Check for hardcoded values that should be variables
    if (line.match(/["'][^"']{20,}["']/)) {
      suggestions.push({
        message: 'Consider storing long string literals in variables for better maintainability.',
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
    // Check for potential XSS vulnerabilities
    if (line.includes('RequestParameter') && !line.includes('Replace')) {
      warnings.push({
        line: lineNumber,
        message: 'Request parameters should be sanitized to prevent XSS attacks.',
        rule: 'ampscript-xss-prevention'
      })
    }

    // Check for SQL injection in Lookup functions
    if (line.match(/Lookup.*RequestParameter/)) {
      errors.push({
        line: lineNumber,
        message: 'Direct use of RequestParameter in Lookup functions may lead to SQL injection.',
        rule: 'ampscript-sql-injection',
        severity: 'error'
      })
    }

    // Check for sensitive data exposure
    if (line.match(/(password|secret|key|token)/i) && line.includes('%%=')) {
      warnings.push({
        line: lineNumber,
        message: 'Avoid outputting sensitive data directly in AMPScript.',
        rule: 'ampscript-sensitive-data'
      })
    }
  }

  private checkPerformance(
    line: string, 
    lineNumber: number, 
    warnings: ValidationWarning[], 
    suggestions: ValidationSuggestion[]
  ): void {
    // Check for multiple Lookup calls that could be optimized
    const lookupCount = (line.match(/Lookup\s*\(/g) || []).length
    if (lookupCount > 1) {
      suggestions.push({
        message: 'Consider using LookupRows() instead of multiple Lookup() calls for better performance.',
        type: 'performance'
      })
    }

    // Check for nested function calls that could be optimized
    const nestedFunctions = line.match(/\w+\s*\([^)]*\w+\s*\([^)]*\)/g)
    if (nestedFunctions && nestedFunctions.length > 2) {
      suggestions.push({
        message: 'Consider breaking complex nested function calls into separate variables for better readability and performance.',
        type: 'performance'
      })
    }

    // Check for inefficient string concatenation
    if (line.match(/Concat\s*\([^)]*Concat\s*\(/)) {
      suggestions.push({
        message: 'Use a single Concat() call with multiple parameters instead of nested Concat() calls.',
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
    // Check for proper error handling
    if (code.includes('Lookup') && !code.includes('IsNull')) {
      suggestions.push({
        message: 'Consider adding null checks for Lookup results to handle missing data gracefully.',
        type: 'best_practice'
      })
    }

    // Check for code organization
    const codeLength = code.length
    if (codeLength > 2000) {
      suggestions.push({
        message: 'Consider breaking large AMPScript blocks into smaller, more manageable pieces.',
        type: 'maintainability'
      })
    }

    // Check for proper commenting
    const commentLines = (code.match(/\/\*[\s\S]*?\*\//g) || []).length
    const codeLines = code.split('\n').filter(line => line.trim().length > 0).length
    
    if (codeLines > 10 && commentLines === 0) {
      suggestions.push({
        message: 'Add comments to explain complex AMPScript logic for better maintainability.',
        type: 'maintainability'
      })
    }
  }

  private isCustomFunction(functionName: string): boolean {
    // Check if it's a custom function (starts with uppercase, not in standard functions)
    return /^[A-Z][A-Za-z0-9]*$/.test(functionName) && 
           !this.AMPSCRIPT_FUNCTIONS.includes(functionName)
  }
}