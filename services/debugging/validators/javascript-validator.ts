import { LanguageValidator, DebugError, OptimizationSuggestion, ErrorSeverity } from '../../../types/debugging'

export class JavaScriptValidator implements LanguageValidator {
  private readonly JS_KEYWORDS = [
    'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'default', 'break', 'continue', 'try', 'catch', 'finally',
    'throw', 'new', 'this', 'typeof', 'instanceof', 'in', 'delete', 'void'
  ]

  private readonly GLOBAL_OBJECTS = [
    'window', 'document', 'console', 'Array', 'Object', 'String', 'Number',
    'Boolean', 'Date', 'RegExp', 'Math', 'JSON', 'Promise', 'setTimeout',
    'setInterval', 'clearTimeout', 'clearInterval'
  ]

  async validateSyntax(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for missing semicolons
      errors.push(...this.validateSemicolons(line, lineNumber))
      
      // Check for bracket matching
      errors.push(...this.validateBrackets(line, lineNumber))
      
      // Check for variable declarations
      errors.push(...this.validateVariableDeclarations(line, lineNumber))
      
      // Check for function syntax
      errors.push(...this.validateFunctionSyntax(line, lineNumber))
      
      // Check for common syntax errors
      errors.push(...this.validateCommonSyntaxErrors(line, lineNumber))
    }

    // Check for overall structure
    errors.push(...this.validateOverallStructure(code))

    return errors
  }

  async validateSemantics(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    // Track variables and their scope
    const declaredVariables = new Map<string, { line: number, scope: string }>()
    const usedVariables = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Track variable usage
      this.trackVariables(line, lineNumber, declaredVariables, usedVariables)
      
      // Check for undefined variables
      errors.push(...this.validateVariableUsage(line, lineNumber, declaredVariables))
      
      // Check for type-related issues
      errors.push(...this.validateTypeUsage(line, lineNumber))
      
      // Check for async/await usage
      errors.push(...this.validateAsyncAwait(line, lineNumber))
      
      // Check for error handling
      errors.push(...this.validateErrorHandling(line, lineNumber))
      
      // Check for modern JavaScript features
      errors.push(...this.validateModernFeatures(line, lineNumber))
    }

    // Check for unused variables
    errors.push(...this.validateUnusedVariables(declaredVariables, usedVariables))

    return errors
  }

  async analyzePerformance(code: string): Promise<DebugError[]> {
    const issues: DebugError[] = []
    const lines = code.split('\n')

    let loopDepth = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Track loop depth
      if (line.includes('for(') || line.includes('while(') || line.includes('forEach(')) {
        loopDepth++
      }
      if (line.includes('}') && loopDepth > 0) {
        loopDepth--
      }

      // Check for performance issues
      issues.push(...this.analyzePerformanceIssues(line, lineNumber, loopDepth))
      
      // Check for DOM manipulation performance
      issues.push(...this.analyzeDOMPerformance(line, lineNumber))
      
      // Check for memory leaks
      issues.push(...this.analyzeMemoryLeaks(line, lineNumber))
      
      // Check for inefficient operations
      issues.push(...this.analyzeInefficientOperations(line, lineNumber))
    }

    return issues
  }

  async getOptimizationSuggestions(code: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Suggest modern JavaScript features
      suggestions.push(...this.suggestModernJavaScript(line, lineNumber))
      
      // Suggest performance improvements
      suggestions.push(...this.suggestPerformanceImprovements(line, lineNumber))
      
      // Suggest code quality improvements
      suggestions.push(...this.suggestCodeQualityImprovements(line, lineNumber))
      
      // Suggest error handling improvements
      suggestions.push(...this.suggestErrorHandlingImprovements(line, lineNumber))
    }

    return suggestions
  }

  async generateFixedCode(code: string, errors: DebugError[]): Promise<string> {
    let fixedCode = code
    const lines = fixedCode.split('\n')

    const sortedErrors = errors.sort((a, b) => b.line - a.line)

    for (const error of sortedErrors) {
      if (error.fixSuggestion && error.line <= lines.length) {
        const lineIndex = error.line - 1
        lines[lineIndex] = this.applyFix(lines[lineIndex], error)
      }
    }

    return lines.join('\n')
  }

  private validateSemicolons(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const trimmedLine = line.trim()
    
    // Check for missing semicolons (basic heuristic)
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
        !trimmedLine.includes('else') &&
        (trimmedLine.includes('=') || trimmedLine.includes('return') || 
         trimmedLine.includes('console.') || trimmedLine.includes('var ') ||
         trimmedLine.includes('let ') || trimmedLine.includes('const '))) {
      
      errors.push({
        id: `missing_semicolon_${lineNumber}`,
        line: lineNumber,
        column: trimmedLine.length,
        severity: 'warning' as ErrorSeverity,
        message: 'Missing semicolon at end of statement',
        rule: 'js-semicolon',
        category: 'syntax',
        fixSuggestion: 'Add semicolon at end of statement'
      })
    }

    return errors
  }

  private validateBrackets(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for unmatched brackets
    const openParens = (line.match(/\(/g) || []).length
    const closeParens = (line.match(/\)/g) || []).length
    const openBrackets = (line.match(/\[/g) || []).length
    const closeBrackets = (line.match(/\]/g) || []).length
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length
    
    if (openParens !== closeParens) {
      errors.push({
        id: `unmatched_parens_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Unmatched parentheses',
        rule: 'js-unmatched-parens',
        category: 'syntax',
        fixSuggestion: openParens > closeParens ? 'Add missing closing parenthesis' : 'Remove extra closing parenthesis'
      })
    }

    if (openBrackets !== closeBrackets) {
      errors.push({
        id: `unmatched_brackets_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Unmatched square brackets',
        rule: 'js-unmatched-brackets',
        category: 'syntax',
        fixSuggestion: openBrackets > closeBrackets ? 'Add missing closing bracket' : 'Remove extra closing bracket'
      })
    }

    return errors
  }

  private validateVariableDeclarations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for var usage (suggest let/const)
    if (line.includes('var ')) {
      errors.push({
        id: `var_usage_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('var ') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Consider using let or const instead of var',
        rule: 'js-var-usage',
        category: 'semantic',
        fixSuggestion: 'Replace var with let (for mutable) or const (for immutable) variables'
      })
    }

    // Check for const without initialization
    const constMatch = line.match(/const\s+(\w+)\s*;/)
    if (constMatch) {
      errors.push({
        id: `const_no_init_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('const') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'const declarations must be initialized',
        rule: 'js-const-initialization',
        category: 'syntax',
        fixSuggestion: 'Initialize const variable or use let instead'
      })
    }

    return errors
  }

  private validateFunctionSyntax(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for function declarations
    if (line.includes('function ') && !line.includes('(')) {
      errors.push({
        id: `function_syntax_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('function') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Function declaration missing parentheses',
        rule: 'js-function-syntax',
        category: 'syntax',
        fixSuggestion: 'Add parentheses after function name'
      })
    }

    // Check for arrow function syntax
    if (line.includes('=>') && !line.includes('(') && line.includes(',')) {
      errors.push({
        id: `arrow_function_params_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('=>') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Arrow function with multiple parameters needs parentheses',
        rule: 'js-arrow-function-params',
        category: 'syntax',
        fixSuggestion: 'Wrap multiple parameters in parentheses'
      })
    }

    return errors
  }

  private validateCommonSyntaxErrors(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for assignment in conditions
    const ifPattern = /if\s*\(\s*\w+\s*=\s*[^=]/
    if (ifPattern.test(line)) {
      errors.push({
        id: `assignment_in_condition_${lineNumber}`,
        line: lineNumber,
        column: line.search(ifPattern) + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Use === for comparison, not = (assignment) in conditions',
        rule: 'js-assignment-in-condition',
        category: 'syntax',
        fixSuggestion: 'Replace = with === for strict equality comparison'
      })
    }

    // Check for == instead of ===
    if (line.includes('==') && !line.includes('===') && !line.includes('!==')) {
      errors.push({
        id: `loose_equality_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('==') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Use strict equality (===) instead of loose equality (==)',
        rule: 'js-strict-equality',
        category: 'semantic',
        fixSuggestion: 'Replace == with === for strict equality comparison'
      })
    }

    return errors
  }

  private validateOverallStructure(code: string): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for balanced braces
    const openBraces = (code.match(/\{/g) || []).length
    const closeBraces = (code.match(/\}/g) || []).length
    
    if (openBraces !== closeBraces) {
      errors.push({
        id: 'unbalanced_braces',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
        rule: 'js-balanced-braces',
        category: 'syntax',
        fixSuggestion: openBraces > closeBraces ? 'Add missing closing braces' : 'Remove extra closing braces'
      })
    }

    return errors
  }

  private trackVariables(
    line: string, 
    lineNumber: number, 
    declared: Map<string, { line: number, scope: string }>, 
    used: Set<string>
  ): void {
    // Track variable declarations
    const varMatches = line.match(/(var|let|const)\s+(\w+)/g)
    if (varMatches) {
      varMatches.forEach(match => {
        const parts = match.split(/\s+/)
        const varName = parts[1]
        declared.set(varName, { line: lineNumber, scope: 'local' })
      })
    }

    // Track variable usage
    const usageMatches = line.match(/\b(\w+)\b/g)
    if (usageMatches) {
      usageMatches.forEach(varName => {
        if (!this.isKeywordOrGlobal(varName) && !line.includes(`${varName} =`)) {
          used.add(varName)
        }
      })
    }
  }

  private validateVariableUsage(
    line: string, 
    lineNumber: number, 
    declared: Map<string, { line: number, scope: string }>
  ): DebugError[] {
    const errors: DebugError[] = []
    
    // This would need more sophisticated parsing for accurate results
    // For now, we'll do basic checks
    
    return errors
  }

  private validateTypeUsage(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for potential type coercion issues
    if (line.includes('+') && line.includes('"') && line.includes('number')) {
      errors.push({
        id: `type_coercion_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('+') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Potential unintended type coercion with + operator',
        rule: 'js-type-coercion',
        category: 'semantic',
        fixSuggestion: 'Use explicit type conversion or template literals'
      })
    }

    return errors
  }

  private validateAsyncAwait(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for await without async
    if (line.includes('await ') && !line.includes('async')) {
      errors.push({
        id: `await_without_async_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('await') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'await can only be used in async functions',
        rule: 'js-await-async',
        category: 'syntax',
        fixSuggestion: 'Add async keyword to function declaration'
      })
    }

    return errors
  }

  private validateErrorHandling(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for Promise without catch
    if (line.includes('.then(') && !line.includes('.catch(')) {
      errors.push({
        id: `promise_no_catch_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('.then(') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Promise should include error handling with .catch()',
        rule: 'js-promise-catch',
        category: 'semantic',
        fixSuggestion: 'Add .catch() to handle promise rejections'
      })
    }

    return errors
  }

  private validateModernFeatures(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for old-style function expressions that could be arrow functions
    if (line.includes('function(') && line.includes('return') && line.length < 100) {
      errors.push({
        id: `arrow_function_opportunity_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('function(') + 1,
        severity: 'info' as ErrorSeverity,
        message: 'Consider using arrow function for shorter syntax',
        rule: 'js-arrow-function-opportunity',
        category: 'semantic',
        fixSuggestion: 'Convert to arrow function: () => expression'
      })
    }

    return errors
  }

  private validateUnusedVariables(
    declared: Map<string, { line: number, scope: string }>, 
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
          rule: 'js-unused-variable',
          category: 'semantic',
          fixSuggestion: `Remove unused variable '${varName}' or use it in the code`
        })
      }
    })

    return errors
  }

  private analyzePerformanceIssues(line: string, lineNumber: number, loopDepth: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for expensive operations in loops
    const expensiveOperations = ['document.getElementById', 'document.querySelector', 'JSON.parse', 'JSON.stringify']
    
    expensiveOperations.forEach(operation => {
      if (line.includes(operation) && loopDepth > 0) {
        issues.push({
          id: `expensive_in_loop_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(operation) + 1,
          severity: 'warning' as ErrorSeverity,
          message: `${operation} in loop can cause performance issues`,
          rule: 'js-expensive-in-loop',
          category: 'performance',
          fixSuggestion: `Move ${operation} outside loop or cache the result`
        })
      }
    })

    return issues
  }

  private analyzeDOMPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for repeated DOM queries
    if (line.includes('document.getElementById') || line.includes('document.querySelector')) {
      issues.push({
        id: `dom_query_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'info' as ErrorSeverity,
        message: 'Consider caching DOM queries for better performance',
        rule: 'js-dom-caching',
        category: 'performance',
        fixSuggestion: 'Cache DOM elements in variables to avoid repeated queries'
      })
    }

    return issues
  }

  private analyzeMemoryLeaks(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for event listeners without removal
    if (line.includes('addEventListener') && !line.includes('removeEventListener')) {
      issues.push({
        id: `event_listener_leak_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('addEventListener') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Event listeners should be removed to prevent memory leaks',
        rule: 'js-event-listener-cleanup',
        category: 'performance',
        fixSuggestion: 'Add corresponding removeEventListener or use AbortController'
      })
    }

    return issues
  }

  private analyzeInefficientOperations(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for inefficient array operations
    if (line.includes('for(') && line.includes('.length')) {
      issues.push({
        id: `array_length_in_loop_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'info' as ErrorSeverity,
        message: 'Cache array length outside loop for better performance',
        rule: 'js-cache-array-length',
        category: 'performance',
        fixSuggestion: 'Store array.length in a variable before the loop'
      })
    }

    return issues
  }

  private suggestModernJavaScript(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest template literals
    if (line.includes('+') && line.includes('"') && line.includes('variable')) {
      suggestions.push({
        id: `template_literals_${lineNumber}`,
        type: 'readability',
        title: 'Use template literals for string interpolation',
        description: 'Template literals are more readable than string concatenation',
        impact: 'low',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: '`Hello ${variable}!`',
        estimatedImprovement: 'Improved readability'
      })
    }

    // Suggest destructuring
    if (line.includes('.') && line.includes('=') && line.includes('object')) {
      suggestions.push({
        id: `destructuring_${lineNumber}`,
        type: 'readability',
        title: 'Consider using destructuring assignment',
        description: 'Destructuring can make code more concise and readable',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: 'const { property } = object;',
        estimatedImprovement: 'More concise code'
      })
    }

    return suggestions
  }

  private suggestPerformanceImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest debouncing for event handlers
    if (line.includes('addEventListener') && (line.includes('scroll') || line.includes('resize'))) {
      suggestions.push({
        id: `debounce_events_${lineNumber}`,
        type: 'performance',
        title: 'Consider debouncing scroll/resize events',
        description: 'Debouncing prevents excessive function calls during scroll/resize',
        impact: 'high',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: 'element.addEventListener("scroll", debounce(handler, 100));',
        estimatedImprovement: 'Better scroll/resize performance'
      })
    }

    return suggestions
  }

  private suggestCodeQualityImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest const for variables that don't change
    if (line.includes('let ') && !line.includes('=')) {
      suggestions.push({
        id: `use_const_${lineNumber}`,
        type: 'maintainability',
        title: 'Use const for variables that don\'t change',
        description: 'const prevents accidental reassignment and shows intent',
        impact: 'low',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: line.replace('let ', 'const '),
        estimatedImprovement: 'Better code safety'
      })
    }

    return suggestions
  }

  private suggestErrorHandlingImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest try-catch for risky operations
    if (line.includes('JSON.parse') || line.includes('localStorage.getItem')) {
      suggestions.push({
        id: `error_handling_${lineNumber}`,
        type: 'maintainability',
        title: 'Add error handling for potentially failing operations',
        description: 'JSON.parse and localStorage operations can throw errors',
        impact: 'high',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: `try { ${line.trim()} } catch (error) { /* handle error */ }`,
        estimatedImprovement: 'Better error resilience'
      })
    }

    return suggestions
  }

  private applyFix(line: string, error: DebugError): string {
    switch (error.rule) {
      case 'js-semicolon':
        return line.trim() + ';'
      case 'js-strict-equality':
        return line.replace(/==/g, '===').replace(/!=/g, '!==')
      case 'js-var-usage':
        return line.replace(/var /g, 'let ')
      case 'js-assignment-in-condition':
        return line.replace(/=\s*([^=])/g, '=== $1')
      default:
        return line
    }
  }

  private isKeywordOrGlobal(name: string): boolean {
    return this.JS_KEYWORDS.includes(name) || this.GLOBAL_OBJECTS.includes(name)
  }
}