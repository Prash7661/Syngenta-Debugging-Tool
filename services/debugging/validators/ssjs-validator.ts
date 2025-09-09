import { LanguageValidator, DebugError, OptimizationSuggestion, ErrorSeverity } from '../../../types/debugging'

export class SSJSValidator implements LanguageValidator {
  private readonly SSJS_CORE_FUNCTIONS = [
    'Platform.Load', 'Platform.Function.ContentBlockByName', 'Platform.Function.ContentBlockById',
    'Platform.Function.TreatAsContent', 'Platform.Function.TreatAsContentArea'
  ]

  private readonly SSJS_OBJECTS = [
    'Platform', 'Attribute', 'DataExtension', 'Variable', 'Request', 'HTTPRequestHeader',
    'Script', 'WSProxy', 'Core'
  ]

  private readonly PERFORMANCE_SENSITIVE_OPERATIONS = [
    'DataExtension.Init', 'WSProxy', 'HTTP.Get', 'HTTP.Post', 'Platform.Function',
    'Platform.Load', 'Script.Util.HttpRequest', 'Script.Util.WSProxy'
  ]

  private readonly SFMC_DATA_OPERATIONS = [
    'DataExtension.Init', 'Rows.Add', 'Rows.Update', 'Rows.Remove', 'Rows.Lookup',
    'Rows.Retrieve', 'Fields.Retrieve'
  ]

  private readonly MEMORY_INTENSIVE_OPERATIONS = [
    'Rows.Retrieve', 'WSProxy.retrieve', 'HTTP.Get', 'Platform.Function.ContentBlockByName'
  ]

  async validateSyntax(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for script tags
      errors.push(...this.validateScriptTags(line, lineNumber))
      
      // Check for semicolons
      errors.push(...this.validateSemicolons(line, lineNumber))
      
      // Check for variable declarations
      errors.push(...this.validateVariableDeclarations(line, lineNumber))
      
      // Check for function calls
      errors.push(...this.validateFunctionCalls(line, lineNumber))
      
      // Check for object usage
      errors.push(...this.validateObjectUsage(line, lineNumber))
      
      // Check for common syntax errors
      errors.push(...this.validateCommonSyntaxErrors(line, lineNumber))
    }

    // Check for block-level issues
    errors.push(...this.validateBlockStructure(code))

    return errors
  }

  async validateSemantics(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    // Track variables and their scope
    const declaredVariables = new Map<string, { line: number, type?: string }>()
    const usedVariables = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Track variable declarations and usage
      this.trackVariables(line, lineNumber, declaredVariables, usedVariables)
      
      // Check for undefined variables
      errors.push(...this.validateVariableUsage(line, lineNumber, declaredVariables))
      
      // Check for Platform.Load usage
      errors.push(...this.validatePlatformLoad(line, lineNumber))
      
      // Check for DataExtension operations
      errors.push(...this.validateDataExtensionOperations(line, lineNumber))
      
      // Check for WSProxy operations
      errors.push(...this.validateWSProxyOperations(line, lineNumber))
      
      // Check for error handling
      errors.push(...this.validateErrorHandling(line, lineNumber))
      
      // Check SFMC best practices
      errors.push(...this.validateSFMCBestPractices(line, lineNumber))
    }

    // Check for unused variables
    errors.push(...this.validateUnusedVariables(declaredVariables, usedVariables))

    return errors
  }

  async analyzePerformance(code: string): Promise<DebugError[]> {
    const issues: DebugError[] = []
    const lines = code.split('\n')

    let loopDepth = 0
    let hasPerformanceIssues = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Track loop depth
      if (line.includes('for(') || line.includes('while(')) {
        loopDepth++
      }
      if (line.includes('}') && loopDepth > 0) {
        loopDepth--
      }

      // Check for performance-sensitive operations
      issues.push(...this.analyzePerformanceSensitiveOperations(line, lineNumber, loopDepth))
      
      // Check for inefficient data operations
      issues.push(...this.analyzeDataOperationEfficiency(line, lineNumber))
      
      // Check for memory usage patterns
      issues.push(...this.analyzeMemoryUsage(line, lineNumber))
      
      // Check for API call patterns
      issues.push(...this.analyzeAPICallPatterns(line, lineNumber))
      
      // Check for string operations
      issues.push(...this.analyzeStringOperations(line, lineNumber))
      
      // Analyze SFMC data operations
      issues.push(...this.analyzeSFMCDataOperations(line, lineNumber))
      
      // Analyze memory intensive operations
      issues.push(...this.analyzeMemoryIntensiveOperations(line, lineNumber))
    }

    return issues
  }

  async getOptimizationSuggestions(code: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Suggest performance improvements
      suggestions.push(...this.suggestPerformanceImprovements(line, lineNumber))
      
      // Suggest code structure improvements
      suggestions.push(...this.suggestStructureImprovements(line, lineNumber))
      
      // Suggest error handling improvements
      suggestions.push(...this.suggestErrorHandlingImprovements(line, lineNumber))
      
      // Suggest memory optimization
      suggestions.push(...this.suggestMemoryOptimizations(line, lineNumber))
    }

    return suggestions
  }

  async generateFixedCode(code: string, errors: DebugError[]): Promise<string> {
    let fixedCode = code
    const lines = fixedCode.split('\n')

    // Sort errors by line number in descending order
    const sortedErrors = errors.sort((a, b) => b.line - a.line)

    for (const error of sortedErrors) {
      if (error.fixSuggestion && error.line <= lines.length) {
        const lineIndex = error.line - 1
        lines[lineIndex] = this.applyFix(lines[lineIndex], error)
      }
    }

    return lines.join('\n')
  }

  private validateScriptTags(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for proper script tag
    if (line.includes('<script') && !line.includes('runat="server"')) {
      errors.push({
        id: `script_tag_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('<script') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'SSJS requires runat="server" attribute in script tag',
        rule: 'ssjs-script-tag',
        category: 'syntax',
        fixSuggestion: 'Add runat="server" to script tag'
      })
    }

    return errors
  }

  private validateSemicolons(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for missing semicolons (basic heuristic)
    const trimmedLine = line.trim()
    if (trimmedLine && 
        !trimmedLine.endsWith(';') && 
        !trimmedLine.endsWith('{') && 
        !trimmedLine.endsWith('}') &&
        !trimmedLine.startsWith('//') &&
        !trimmedLine.startsWith('/*') &&
        !trimmedLine.includes('if(') &&
        !trimmedLine.includes('for(') &&
        !trimmedLine.includes('while(') &&
        !trimmedLine.includes('function') &&
        !trimmedLine.includes('<script') &&
        !trimmedLine.includes('</script>')) {
      
      errors.push({
        id: `missing_semicolon_${lineNumber}`,
        line: lineNumber,
        column: trimmedLine.length,
        severity: 'error' as ErrorSeverity,
        message: 'Missing semicolon at end of statement',
        rule: 'ssjs-semicolon',
        category: 'syntax',
        fixSuggestion: 'Add semicolon at end of line'
      })
    }

    return errors
  }

  private validateVariableDeclarations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for var keyword usage
    const varMatches = line.match(/\bvar\s+(\w+)/g)
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.split(/\s+/)[1]
        if (!line.includes('=')) {
          errors.push({
            id: `var_not_initialized_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(match) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `Variable '${varName}' declared but not initialized`,
            rule: 'ssjs-var-initialization',
            category: 'semantic',
            fixSuggestion: `Initialize variable: var ${varName} = defaultValue;`
          })
        }
      })
    }

    // Check for undeclared variables (assignment without var)
    const assignmentMatches = line.match(/(\w+)\s*=/g)
    if (assignmentMatches) {
      assignmentMatches.forEach(match => {
        const varName = match.split('=')[0].trim()
        if (!line.includes('var ' + varName) && 
            !this.isKnownObject(varName) &&
            !line.includes('function')) {
          errors.push({
            id: `undeclared_variable_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(match) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `Variable '${varName}' used without declaration`,
            rule: 'ssjs-undeclared-variable',
            category: 'semantic',
            fixSuggestion: `Declare variable: var ${varName} = ...;`
          })
        }
      })
    }

    return errors
  }

  private validateFunctionCalls(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for common function call errors
    if (line.includes('Platform.Load(') && !line.includes('"Core"')) {
      errors.push({
        id: `platform_load_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('Platform.Load') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Platform.Load should typically load "Core" library',
        rule: 'ssjs-platform-load',
        category: 'semantic',
        fixSuggestion: 'Use Platform.Load("Core", "1"); for basic functionality'
      })
    }

    // Check for DataExtension.Init without proper parameters
    if (line.includes('DataExtension.Init(') && !line.includes('"')) {
      errors.push({
        id: `de_init_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('DataExtension.Init') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'DataExtension.Init requires data extension name as string parameter',
        rule: 'ssjs-de-init',
        category: 'semantic',
        fixSuggestion: 'Provide data extension name: DataExtension.Init("DataExtensionName");'
      })
    }

    return errors
  }

  private validateObjectUsage(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for proper object initialization
    if (line.includes('new DataExtension(')) {
      errors.push({
        id: `de_constructor_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('new DataExtension') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Use DataExtension.Init() instead of new DataExtension()',
        rule: 'ssjs-de-constructor',
        category: 'semantic',
        fixSuggestion: 'Replace with DataExtension.Init("DataExtensionName");'
      })
    }

    return errors
  }

  private validateCommonSyntaxErrors(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for assignment in conditions
    const ifPattern = /if\s*\(\s*\w+\s*=\s*[^=]/i
    if (ifPattern.test(line)) {
      errors.push({
        id: `assignment_in_condition_${lineNumber}`,
        line: lineNumber,
        column: line.search(ifPattern) + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Use == for comparison, not = (assignment) in if conditions',
        rule: 'ssjs-comparison',
        category: 'syntax',
        fixSuggestion: 'Replace = with == for comparison'
      })
    }

    // Check for missing return statements in functions
    if (line.includes('function ') && !line.includes('=>')) {
      // This would need more context to be fully accurate
      errors.push({
        id: `function_return_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'info' as ErrorSeverity,
        message: 'Ensure function has appropriate return statement',
        rule: 'ssjs-function-return',
        category: 'semantic',
        fixSuggestion: 'Add return statement if function should return a value'
      })
    }

    return errors
  }

  private validateBlockStructure(code: string): DebugError[] {
    const errors: DebugError[] = []
    
    let braceCount = 0
    let parenCount = 0
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1
      
      // Count braces
      braceCount += (line.match(/\{/g) || []).length
      braceCount -= (line.match(/\}/g) || []).length
      
      // Count parentheses
      parenCount += (line.match(/\(/g) || []).length
      parenCount -= (line.match(/\)/g) || []).length
    }
    
    if (braceCount !== 0) {
      errors.push({
        id: 'unmatched_braces',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: `Unmatched braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'} braces`,
        rule: 'ssjs-brace-matching',
        category: 'syntax',
        fixSuggestion: braceCount > 0 ? 'Add missing closing braces' : 'Remove extra closing braces'
      })
    }
    
    if (parenCount !== 0) {
      errors.push({
        id: 'unmatched_parentheses',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: `Unmatched parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'} parentheses`,
        rule: 'ssjs-paren-matching',
        category: 'syntax',
        fixSuggestion: parenCount > 0 ? 'Add missing closing parentheses' : 'Remove extra closing parentheses'
      })
    }
    
    return errors
  }

  private trackVariables(
    line: string, 
    lineNumber: number, 
    declared: Map<string, { line: number, type?: string }>, 
    used: Set<string>
  ): void {
    // Track var declarations
    const varMatches = line.match(/var\s+(\w+)/g)
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.split(/\s+/)[1]
        declared.set(varName, { line: lineNumber })
      })
    }

    // Track variable usage
    const usageMatches = line.match(/\b(\w+)\b/g)
    if (usageMatches) {
      usageMatches.forEach(varName => {
        if (!this.isKeywordOrObject(varName) && !line.includes('var ' + varName)) {
          used.add(varName)
        }
      })
    }
  }

  private validateVariableUsage(
    line: string, 
    lineNumber: number, 
    declared: Map<string, { line: number, type?: string }>
  ): DebugError[] {
    const errors: DebugError[] = []
    
    // This would need more sophisticated parsing for accurate results
    // For now, we'll do basic checks
    
    return errors
  }

  private validatePlatformLoad(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    if (line.includes('Platform.Load(')) {
      // Check if it's at the beginning of the script
      if (lineNumber > 5) {
        errors.push({
          id: `platform_load_position_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf('Platform.Load') + 1,
          severity: 'warning' as ErrorSeverity,
          message: 'Platform.Load should typically be called at the beginning of the script',
          rule: 'ssjs-platform-load-position',
          category: 'semantic',
          fixSuggestion: 'Move Platform.Load to the beginning of the script'
        })
      }
    }

    return errors
  }

  private validateDataExtensionOperations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for proper DataExtension usage
    if (line.includes('DataExtension.') && !line.includes('DataExtension.Init')) {
      if (!line.includes('var de = ') && !line.includes('de.')) {
        errors.push({
          id: `de_usage_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf('DataExtension') + 1,
          severity: 'warning' as ErrorSeverity,
          message: 'DataExtension operations should use initialized DataExtension object',
          rule: 'ssjs-de-usage',
          category: 'semantic',
          fixSuggestion: 'Initialize DataExtension first: var de = DataExtension.Init("Name");'
        })
      }
    }

    return errors
  }

  private validateWSProxyOperations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    if (line.includes('WSProxy(')) {
      errors.push({
        id: `wsproxy_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('WSProxy') + 1,
        severity: 'info' as ErrorSeverity,
        message: 'WSProxy operations require proper authentication and error handling',
        rule: 'ssjs-wsproxy',
        category: 'semantic',
        fixSuggestion: 'Ensure proper authentication and add error handling for WSProxy calls'
      })
    }

    return errors
  }

  private validateErrorHandling(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for try-catch blocks around risky operations
    const riskyOperations = ['WSProxy', 'HTTP.Get', 'HTTP.Post', 'DataExtension.Init']
    
    riskyOperations.forEach(operation => {
      if (line.includes(operation)) {
        // This would need more context to check if it's in a try-catch
        errors.push({
          id: `error_handling_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(operation) + 1,
          severity: 'warning' as ErrorSeverity,
          message: `${operation} should be wrapped in try-catch for error handling`,
          rule: 'ssjs-error-handling',
          category: 'semantic',
          fixSuggestion: `Wrap ${operation} in try-catch block`
        })
      }
    })

    return errors
  }

  private validateUnusedVariables(
    declared: Map<string, { line: number, type?: string }>, 
    used: Set<string>
  ): DebugError[] {
    const errors: DebugError[] = []
    
    declared.forEach((info, varName) => {
      if (!used.has(varName)) {
        errors.push({
          id: `unused_variable_${varName}`,
          line: info.line,
          column: 1,
          severity: 'warning' as ErrorSeverity,
          message: `Variable '${varName}' declared but never used`,
          rule: 'ssjs-unused-variable',
          category: 'semantic',
          fixSuggestion: `Remove unused variable '${varName}' or use it in the code`
        })
      }
    })

    return errors
  }

  private analyzePerformanceSensitiveOperations(line: string, lineNumber: number, loopDepth: number): DebugError[] {
    const issues: DebugError[] = []
    
    this.PERFORMANCE_SENSITIVE_OPERATIONS.forEach(operation => {
      if (line.includes(operation)) {
        if (loopDepth > 0) {
          issues.push({
            id: `performance_in_loop_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(operation) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `${operation} inside loop can cause performance issues`,
            rule: 'ssjs-performance-loop',
            category: 'performance',
            fixSuggestion: `Move ${operation} outside loop or optimize loop structure`
          })
        }
        
        if (loopDepth > 1) {
          issues.push({
            id: `performance_nested_loop_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(operation) + 1,
            severity: 'error' as ErrorSeverity,
            message: `${operation} in nested loop will cause severe performance degradation`,
            rule: 'ssjs-performance-nested-loop',
            category: 'performance',
            fixSuggestion: `Restructure code to avoid ${operation} in nested loops`
          })
        }
      }
    })

    return issues
  }

  private analyzeDataOperationEfficiency(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for inefficient data operations
    if (line.includes('DataExtension.Init(') && line.includes('for(')) {
      issues.push({
        id: `de_init_in_loop_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Initializing DataExtension inside loop is inefficient',
        rule: 'ssjs-de-init-efficiency',
        category: 'performance',
        fixSuggestion: 'Initialize DataExtension once outside the loop'
      })
    }

    return issues
  }

  private analyzeMemoryUsage(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for potential memory leaks
    if (line.includes('var ') && line.includes('[]')) {
      issues.push({
        id: `array_memory_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('var') + 1,
        severity: 'info' as ErrorSeverity,
        message: 'Large arrays can consume significant memory',
        rule: 'ssjs-memory-arrays',
        category: 'performance',
        fixSuggestion: 'Consider processing data in chunks for large datasets'
      })
    }

    return issues
  }

  private analyzeAPICallPatterns(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    const apiCalls = ['HTTP.Get', 'HTTP.Post', 'WSProxy']
    
    apiCalls.forEach(apiCall => {
      if (line.includes(apiCall)) {
        issues.push({
          id: `api_call_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(apiCall) + 1,
          severity: 'info' as ErrorSeverity,
          message: `${apiCall} detected - consider caching and rate limiting`,
          rule: 'ssjs-api-optimization',
          category: 'performance',
          fixSuggestion: 'Implement caching and rate limiting for API calls'
        })
      }
    })

    return issues
  }

  private analyzeStringOperations(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for string concatenation in loops
    if (line.includes('+') && line.includes('"') && line.includes('for(')) {
      issues.push({
        id: `string_concat_loop_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'String concatenation in loops can be inefficient',
        rule: 'ssjs-string-concat-performance',
        category: 'performance',
        fixSuggestion: 'Use array.join() or build strings outside loops'
      })
    }

    return issues
  }

  private analyzeSFMCDataOperations(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for inefficient data extension operations
    this.SFMC_DATA_OPERATIONS.forEach(operation => {
      if (line.includes(operation)) {
        // Check if operation is in a loop
        if (line.includes('for(') || line.includes('while(')) {
          issues.push({
            id: `data_operation_in_loop_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(operation) + 1,
            severity: 'error' as ErrorSeverity,
            message: `${operation} in loop will cause severe performance issues`,
            rule: 'ssjs-data-operation-loop',
            category: 'performance',
            fixSuggestion: `Move ${operation} outside loop or use batch operations`
          })
        }

        // Check for missing error handling
        if (!line.includes('try') && !line.includes('catch')) {
          issues.push({
            id: `data_operation_no_error_handling_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(operation) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `${operation} should include error handling`,
            rule: 'ssjs-data-operation-error-handling',
            category: 'semantic',
            fixSuggestion: `Wrap ${operation} in try-catch block`
          })
        }
      }
    })

    return issues
  }

  private analyzeMemoryIntensiveOperations(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    this.MEMORY_INTENSIVE_OPERATIONS.forEach(operation => {
      if (line.includes(operation)) {
        issues.push({
          id: `memory_intensive_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(operation) + 1,
          severity: 'warning' as ErrorSeverity,
          message: `${operation} can consume significant memory`,
          rule: 'ssjs-memory-intensive',
          category: 'performance',
          fixSuggestion: 'Consider pagination or chunking for large datasets'
        })

        // Check for result set size limiting
        if (operation.includes('Retrieve') && !line.includes('Filter') && !line.includes('SimpleFilter')) {
          issues.push({
            id: `unlimited_retrieve_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(operation) + 1,
            severity: 'error' as ErrorSeverity,
            message: `${operation} without filtering can return all records`,
            rule: 'ssjs-unlimited-retrieve',
            category: 'performance',
            fixSuggestion: 'Add Filter or SimpleFilter to limit result set'
          })
        }
      }
    })

    return issues
  }

  private validateSFMCBestPractices(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for proper Platform.Load usage
    if (line.includes('Platform.Load(') && !line.includes('"Core"')) {
      errors.push({
        id: `platform_load_missing_core_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('Platform.Load') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Platform.Load should include "Core" library for basic functionality',
        rule: 'ssjs-platform-load-core',
        category: 'semantic',
        fixSuggestion: 'Add Platform.Load("Core", "1"); at the beginning of script'
      })
    }

    // Check for DataExtension initialization patterns
    if (line.includes('DataExtension.Init(') && !line.includes('var ')) {
      errors.push({
        id: `de_init_not_assigned_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('DataExtension.Init') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'DataExtension.Init() result should be assigned to a variable',
        rule: 'ssjs-de-init-assignment',
        category: 'semantic',
        fixSuggestion: 'Assign result to variable: var de = DataExtension.Init("Name");'
      })
    }

    // Check for WSProxy authentication
    if (line.includes('WSProxy(') && !line.includes('ClientID') && !line.includes('AccessToken')) {
      errors.push({
        id: `wsproxy_no_auth_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('WSProxy') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'WSProxy requires authentication configuration',
        rule: 'ssjs-wsproxy-auth',
        category: 'semantic',
        fixSuggestion: 'Configure WSProxy with proper authentication credentials'
      })
    }

    return errors
  }

  private suggestPerformanceImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest batch operations
    if (line.includes('DataExtension.Init(') && line.includes('for(')) {
      suggestions.push({
        id: `batch_operations_${lineNumber}`,
        type: 'performance',
        title: 'Use batch operations for data processing',
        description: 'Process multiple records in a single operation instead of individual operations in loops',
        impact: 'high',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: '// Use batch operations: de.Rows.Retrieve() or de.Rows.Add()',
        estimatedImprovement: '50-80% performance improvement'
      })
    }

    return suggestions
  }

  private suggestStructureImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest function extraction
    if (line.length > 120) {
      suggestions.push({
        id: `extract_function_${lineNumber}`,
        type: 'maintainability',
        title: 'Consider extracting complex logic into functions',
        description: 'Long lines can be hard to read and maintain',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: '// Extract into separate function for better readability',
        estimatedImprovement: 'Improved code maintainability'
      })
    }

    return suggestions
  }

  private suggestErrorHandlingImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    const riskyOperations = ['WSProxy', 'HTTP.Get', 'HTTP.Post', 'DataExtension.Init']
    
    riskyOperations.forEach(operation => {
      if (line.includes(operation)) {
        suggestions.push({
          id: `error_handling_${lineNumber}`,
          type: 'maintainability',
          title: 'Add comprehensive error handling',
          description: `${operation} operations should include proper error handling and logging`,
          impact: 'high',
          effort: 'medium',
          beforeCode: line.trim(),
          afterCode: `try { ${line.trim()} } catch(ex) { /* Handle error */ }`,
          estimatedImprovement: 'Improved reliability and debugging'
        })
      }
    })

    return suggestions
  }

  private suggestMemoryOptimizations(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    if (line.includes('var ') && line.includes('[]')) {
      suggestions.push({
        id: `memory_optimization_${lineNumber}`,
        type: 'memory',
        title: 'Optimize memory usage for large datasets',
        description: 'Process data in chunks to reduce memory footprint',
        impact: 'medium',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: '// Process in chunks: for(var i = 0; i < data.length; i += chunkSize)',
        estimatedImprovement: 'Reduced memory usage'
      })
    }

    return suggestions
  }

  private applyFix(line: string, error: DebugError): string {
    switch (error.rule) {
      case 'ssjs-semicolon':
        return line.trim() + ';'
      case 'ssjs-comparison':
        return line.replace(/=\s*([^=])/g, '== $1')
      case 'ssjs-script-tag':
        return line.replace('<script', '<script runat="server"')
      case 'ssjs-de-constructor':
        return line.replace(/new DataExtension\(/g, 'DataExtension.Init(')
      default:
        return line
    }
  }

  private isKnownObject(name: string): boolean {
    return this.SSJS_OBJECTS.some(obj => name.startsWith(obj))
  }

  private isKeywordOrObject(name: string): boolean {
    const keywords = ['var', 'function', 'if', 'else', 'for', 'while', 'return', 'try', 'catch', 'throw']
    return keywords.includes(name) || this.isKnownObject(name)
  }
}