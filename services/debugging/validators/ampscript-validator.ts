import { LanguageValidator, DebugError, OptimizationSuggestion, ErrorSeverity } from '../../../types/debugging'

export class AMPScriptValidator implements LanguageValidator {
  private readonly AMPSCRIPT_FUNCTIONS = [
    'AttributeValue', 'Concat', 'Length', 'Substring', 'Replace', 'Uppercase', 'Lowercase',
    'Trim', 'Format', 'FormatCurrency', 'FormatNumber', 'Now', 'DateAdd', 'DateDiff',
    'DatePart', 'IsNull', 'Empty', 'IIF', 'Lookup', 'LookupRows', 'LookupOrderedRows',
    'Row', 'Field', 'RowCount', 'InsertData', 'UpdateData', 'UpsertData', 'DeleteData',
    'CreateSalesforceObject', 'UpdateSingleSalesforceObject', 'RetrieveSalesforceObjects',
    'HTTPGet', 'HTTPPost', 'HTTPPut', 'HTTPDelete', 'Base64Encode', 'Base64Decode',
    'MD5', 'SHA1', 'SHA256', 'GUID', 'Random', 'RedirectTo', 'RaiseError',
    'BuildRowsetFromString', 'BuildRowsetFromXML', 'ClaimRow', 'ClaimRowValue',
    'CreateObject', 'InvokeCreate', 'InvokeDelete', 'InvokeExecute', 'InvokePerform',
    'InvokeRetrieve', 'InvokeUpdate', 'ProperCase', 'RegExMatch', 'RegExReplace',
    'StringToDate', 'StringToHex', 'SystemDateToLocalDate', 'TreatAsContent',
    'TreatAsContentArea', 'UnclaimRow', 'URLEncode', 'v', 'Output'
  ]

  private readonly SFMC_SYSTEM_FUNCTIONS = [
    'CloudPagesURL', 'MicrositeURL', 'RequestParameter', 'QueryParameter',
    'HTTPRequestHeader', 'HTTPResponseHeader', 'GetPortfolioItem', 'SetPortfolioItem'
  ]

  private readonly PERFORMANCE_SENSITIVE_FUNCTIONS = [
    'Lookup', 'LookupRows', 'LookupOrderedRows', 'HTTPGet', 'HTTPPost', 'HTTPPut', 'HTTPDelete',
    'InsertData', 'UpdateData', 'UpsertData', 'DeleteData', 'CreateSalesforceObject',
    'UpdateSingleSalesforceObject', 'RetrieveSalesforceObjects'
  ]

  private readonly AMPSCRIPT_KEYWORDS = [
    'VAR', 'SET', 'IF', 'ELSEIF', 'ELSE', 'ENDIF', 'FOR', 'NEXT', 'DO', 'WHILE'
  ]

  async validateSyntax(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for proper AMPScript delimiters
      errors.push(...this.validateDelimiters(line, lineNumber))
      
      // Check for variable declarations
      errors.push(...this.validateVariableDeclarations(line, lineNumber))
      
      // Check for function usage
      errors.push(...this.validateFunctionUsage(line, lineNumber))
      
      // Check for conditional logic
      errors.push(...this.validateConditionalLogic(line, lineNumber))
      
      // Check for string concatenation
      errors.push(...this.validateStringOperations(line, lineNumber))
      
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

    // Track declared variables
    const declaredVariables = new Set<string>()
    const usedVariables = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Track variable declarations and usage
      this.trackVariables(line, declaredVariables, usedVariables)
      
      // Check for undefined variables
      errors.push(...this.validateVariableUsage(line, lineNumber, declaredVariables))
      
      // Check for data extension operations
      errors.push(...this.validateDataExtensionOperations(line, lineNumber))
      
      // Check for Salesforce operations
      errors.push(...this.validateSalesforceOperations(line, lineNumber))
      
      // Validate SFMC system functions
      errors.push(...this.validateSFMCSystemFunctions(line, lineNumber))
    }

    // Check for unused variables
    errors.push(...this.validateUnusedVariables(declaredVariables, usedVariables))

    return errors
  }

  async analyzePerformance(code: string): Promise<DebugError[]> {
    const issues: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for inefficient operations
      issues.push(...this.analyzeInefficiencies(line, lineNumber))
      
      // Check for excessive API calls
      issues.push(...this.analyzeAPIUsage(line, lineNumber))
      
      // Check for loop performance
      issues.push(...this.analyzeLoopPerformance(line, lineNumber))
      
      // Check for string concatenation performance
      issues.push(...this.analyzeStringPerformance(line, lineNumber))
      
      // Analyze SFMC data extension performance
      issues.push(...this.analyzeSFMCDataExtensionPerformance(line, lineNumber))
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
      
      // Suggest code simplifications
      suggestions.push(...this.suggestCodeSimplifications(line, lineNumber))
      
      // Suggest best practices
      suggestions.push(...this.suggestBestPractices(line, lineNumber))
    }

    return suggestions
  }

  async generateFixedCode(code: string, errors: DebugError[]): Promise<string> {
    let fixedCode = code
    const lines = fixedCode.split('\n')

    // Sort errors by line number in descending order to avoid line number shifts
    const sortedErrors = errors.sort((a, b) => b.line - a.line)

    for (const error of sortedErrors) {
      if (error.fixSuggestion && error.line <= lines.length) {
        const lineIndex = error.line - 1
        lines[lineIndex] = this.applyFix(lines[lineIndex], error)
      }
    }

    return lines.join('\n')
  }

  private validateDelimiters(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for unmatched AMPScript delimiters
    const openDelimiters = (line.match(/%%\[/g) || []).length
    const closeDelimiters = (line.match(/\]%%/g) || []).length
    
    if (openDelimiters !== closeDelimiters) {
      errors.push({
        id: `delimiter_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('%%[') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Unmatched AMPScript delimiters. Each %%[ must have a corresponding ]%%',
        rule: 'ampscript-delimiters',
        category: 'syntax',
        fixSuggestion: openDelimiters > closeDelimiters ? 'Add ]%% at the end' : 'Add %%[ at the beginning'
      })
    }

    // Check for output delimiters
    const outputPattern = /%%=.*?=%% /g
    const matches = line.match(outputPattern)
    if (matches) {
      matches.forEach(match => {
        if (!match.includes('v(') && !match.includes('AttributeValue')) {
          const column = line.indexOf(match) + 1
          errors.push({
            id: `output_${lineNumber}_${column}`,
            line: lineNumber,
            column,
            severity: 'warning' as ErrorSeverity,
            message: 'Consider using v() function for variable output',
            rule: 'ampscript-output',
            category: 'syntax',
            fixSuggestion: 'Use %%=v(@variableName)=%% for variable output'
          })
        }
      })
    }

    return errors
  }

  private validateVariableDeclarations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for VAR declarations without SET
    const varMatch = line.match(/VAR\s+(@\w+)/gi)
    if (varMatch) {
      varMatch.forEach(match => {
        const varName = match.split(/\s+/)[1]
        if (!line.includes('SET ' + varName)) {
          errors.push({
            id: `var_declaration_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(match) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `Variable ${varName} declared but not initialized`,
            rule: 'ampscript-var-init',
            category: 'semantic',
            fixSuggestion: `Add SET ${varName} = [initial_value] after declaration`
          })
        }
      })
    }

    // Check for SET without VAR
    const setMatch = line.match(/SET\s+(@\w+)/gi)
    if (setMatch) {
      setMatch.forEach(match => {
        const varName = match.split(/\s+/)[1]
        // This would need context from previous lines to be fully accurate
        // For now, we'll flag potential issues
      })
    }

    return errors
  }

  private validateFunctionUsage(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for unknown functions
    const functionPattern = /(\w+)\s*\(/g
    let match
    
    while ((match = functionPattern.exec(line)) !== null) {
      const functionName = match[1]
      if (!this.AMPSCRIPT_FUNCTIONS.includes(functionName) && 
          !this.AMPSCRIPT_KEYWORDS.includes(functionName.toUpperCase())) {
        errors.push({
          id: `unknown_function_${lineNumber}_${match.index}`,
          line: lineNumber,
          column: match.index + 1,
          severity: 'error' as ErrorSeverity,
          message: `Unknown AMPScript function: ${functionName}`,
          rule: 'ampscript-unknown-function',
          category: 'semantic',
          fixSuggestion: `Check function name spelling or refer to AMPScript documentation`
        })
      }
    }

    // Check for common function parameter errors
    if (line.includes('AttributeValue(')) {
      const attrMatch = line.match(/AttributeValue\(\s*"([^"]+)"\s*\)/g)
      if (attrMatch) {
        attrMatch.forEach(match => {
          const fieldName = match.match(/"([^"]+)"/)?.[1]
          if (fieldName && fieldName.includes(' ')) {
            errors.push({
              id: `attr_space_${lineNumber}`,
              line: lineNumber,
              column: line.indexOf(match) + 1,
              severity: 'warning' as ErrorSeverity,
              message: 'Attribute names with spaces may cause issues',
              rule: 'ampscript-attr-spaces',
              category: 'semantic',
              fixSuggestion: 'Use field names without spaces or use proper escaping'
            })
          }
        })
      }
    }

    return errors
  }

  private validateConditionalLogic(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for assignment in conditions (= instead of ==)
    const ifPattern = /IF\s+.*?=\s*[^=]/gi
    if (ifPattern.test(line) && !line.includes('==')) {
      errors.push({
        id: `assignment_in_condition_${lineNumber}`,
        line: lineNumber,
        column: line.search(ifPattern) + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Use == for comparison, not = (assignment)',
        rule: 'ampscript-comparison',
        category: 'syntax',
        fixSuggestion: 'Replace = with == for comparison'
      })
    }

    return errors
  }

  private validateStringOperations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for inefficient string concatenation
    const concatCount = (line.match(/Concat\(/g) || []).length
    if (concatCount > 3) {
      errors.push({
        id: `excessive_concat_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Multiple Concat functions may impact performance',
        rule: 'ampscript-concat-performance',
        category: 'performance',
        fixSuggestion: 'Consider combining multiple Concat operations or using Format function'
      })
    }

    return errors
  }

  private validateCommonSyntaxErrors(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for missing semicolons in SSJS blocks
    if (line.includes('<script runat="server">') || line.includes('</script>')) {
      // This is likely SSJS mixed with AMPScript
      errors.push({
        id: `mixed_languages_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Mixing AMPScript with SSJS - ensure proper syntax for each language',
        rule: 'ampscript-mixed-languages',
        category: 'syntax',
        fixSuggestion: 'Separate AMPScript and SSJS blocks clearly'
      })
    }

    return errors
  }

  private validateBlockStructure(code: string): DebugError[] {
    const errors: DebugError[] = []
    const lines = code.split('\n')
    
    let ifCount = 0
    let endifCount = 0
    let forCount = 0
    let nextCount = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase()
      const lineNumber = i + 1
      
      if (line.includes('IF ')) ifCount++
      if (line.includes('ENDIF')) endifCount++
      if (line.includes('FOR ')) forCount++
      if (line.includes('NEXT ')) nextCount++
    }
    
    if (ifCount !== endifCount) {
      errors.push({
        id: 'unmatched_if_endif',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: `Unmatched IF/ENDIF blocks: ${ifCount} IF statements, ${endifCount} ENDIF statements`,
        rule: 'ampscript-block-structure',
        category: 'syntax',
        fixSuggestion: ifCount > endifCount ? 'Add missing ENDIF statements' : 'Remove extra ENDIF statements'
      })
    }
    
    if (forCount !== nextCount) {
      errors.push({
        id: 'unmatched_for_next',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: `Unmatched FOR/NEXT blocks: ${forCount} FOR statements, ${nextCount} NEXT statements`,
        rule: 'ampscript-loop-structure',
        category: 'syntax',
        fixSuggestion: forCount > nextCount ? 'Add missing NEXT statements' : 'Remove extra NEXT statements'
      })
    }
    
    return errors
  }

  private trackVariables(line: string, declared: Set<string>, used: Set<string>): void {
    // Track VAR declarations
    const varMatches = line.match(/VAR\s+(@\w+)/gi)
    if (varMatches) {
      varMatches.forEach(match => {
        const varName = match.split(/\s+/)[1]
        declared.add(varName)
      })
    }

    // Track SET declarations
    const setMatches = line.match(/SET\s+(@\w+)/gi)
    if (setMatches) {
      setMatches.forEach(match => {
        const varName = match.split(/\s+/)[1]
        declared.add(varName)
      })
    }

    // Track variable usage
    const usageMatches = line.match(/@\w+/g)
    if (usageMatches) {
      usageMatches.forEach(varName => {
        if (!line.includes('VAR ' + varName) && !line.includes('SET ' + varName)) {
          used.add(varName)
        }
      })
    }
  }

  private validateVariableUsage(line: string, lineNumber: number, declared: Set<string>): DebugError[] {
    const errors: DebugError[] = []
    
    const usageMatches = line.match(/@\w+/g)
    if (usageMatches) {
      usageMatches.forEach(varName => {
        if (!declared.has(varName) && 
            !line.includes('VAR ' + varName) && 
            !line.includes('SET ' + varName)) {
          errors.push({
            id: `undefined_variable_${lineNumber}_${varName}`,
            line: lineNumber,
            column: line.indexOf(varName) + 1,
            severity: 'error' as ErrorSeverity,
            message: `Variable ${varName} used before declaration`,
            rule: 'ampscript-undefined-variable',
            category: 'semantic',
            fixSuggestion: `Declare ${varName} with VAR or SET before using`
          })
        }
      })
    }

    return errors
  }

  private validateDataExtensionOperations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for data extension operations
    const deOperations = ['InsertData', 'UpdateData', 'UpsertData', 'DeleteData']
    
    deOperations.forEach(operation => {
      if (line.includes(operation + '(')) {
        // Basic validation - would need more context for full validation
        if (!line.includes('"')) {
          errors.push({
            id: `de_operation_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(operation) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `${operation} operation should specify data extension name`,
            rule: 'ampscript-de-operation',
            category: 'semantic',
            fixSuggestion: `Ensure ${operation} includes proper data extension name and field mappings`
          })
        }
      }
    })

    return errors
  }

  private validateSalesforceOperations(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for Salesforce API operations
    const sfOperations = ['CreateSalesforceObject', 'UpdateSingleSalesforceObject', 'RetrieveSalesforceObjects']
    
    sfOperations.forEach(operation => {
      if (line.includes(operation + '(')) {
        // Basic validation
        errors.push({
          id: `sf_operation_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(operation) + 1,
          severity: 'info' as ErrorSeverity,
          message: `${operation} requires proper Salesforce connection and object permissions`,
          rule: 'ampscript-sf-operation',
          category: 'semantic',
          fixSuggestion: 'Ensure Salesforce connection is configured and object permissions are set'
        })
      }
    })

    return errors
  }

  private validateUnusedVariables(declared: Set<string>, used: Set<string>): DebugError[] {
    const errors: DebugError[] = []
    
    declared.forEach(varName => {
      if (!used.has(varName)) {
        errors.push({
          id: `unused_variable_${varName}`,
          line: 1, // Would need to track declaration line
          column: 1,
          severity: 'warning' as ErrorSeverity,
          message: `Variable ${varName} declared but never used`,
          rule: 'ampscript-unused-variable',
          category: 'semantic',
          fixSuggestion: `Remove unused variable ${varName} or use it in the code`
        })
      }
    })

    return errors
  }

  private analyzeInefficiencies(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for nested loops
    if (line.includes('FOR ') && line.includes('FOR ')) {
      issues.push({
        id: `nested_loops_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Nested loops can impact performance significantly',
        rule: 'ampscript-nested-loops',
        category: 'performance',
        fixSuggestion: 'Consider optimizing nested loops or using more efficient data structures'
      })
    }

    return issues
  }

  private analyzeAPIUsage(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    const apiCalls = ['HTTPGet', 'HTTPPost', 'HTTPPut', 'HTTPDelete', 'RetrieveSalesforceObjects']
    
    apiCalls.forEach(apiCall => {
      if (line.includes(apiCall + '(')) {
        issues.push({
          id: `api_call_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(apiCall) + 1,
          severity: 'info' as ErrorSeverity,
          message: `API call detected: ${apiCall} - consider caching results if called multiple times`,
          rule: 'ampscript-api-performance',
          category: 'performance',
          fixSuggestion: 'Cache API results when possible to improve performance'
        })
      }
    })

    return issues
  }

  private analyzeLoopPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    if (line.includes('FOR ') || line.includes('WHILE ')) {
      // Check for operations inside loops that could be optimized
      if (line.includes('Lookup') || line.includes('AttributeValue')) {
        issues.push({
          id: `loop_optimization_${lineNumber}`,
          line: lineNumber,
          column: 1,
          severity: 'warning' as ErrorSeverity,
          message: 'Data operations inside loops can be expensive',
          rule: 'ampscript-loop-optimization',
          category: 'performance',
          fixSuggestion: 'Consider moving data operations outside loops or batch processing'
        })
      }
    }

    return issues
  }

  private analyzeStringPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Count string concatenations
    const concatCount = (line.match(/Concat\(/g) || []).length
    if (concatCount > 5) {
      issues.push({
        id: `string_performance_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Excessive string concatenations may impact performance',
        rule: 'ampscript-string-performance',
        category: 'performance',
        fixSuggestion: 'Consider using Format function or reducing concatenation operations'
      })
    }

    return issues
  }

  private analyzeSFMCDataExtensionPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Check for inefficient Lookup operations
    if (line.includes('Lookup(') && line.includes('FOR')) {
      issues.push({
        id: `lookup_in_loop_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('Lookup(') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'Lookup() in loops causes severe performance degradation',
        rule: 'ampscript-lookup-loop-performance',
        category: 'performance',
        fixSuggestion: 'Use LookupRows() before loop and iterate through results'
      })
    }

    // Check for LookupRows without proper filtering
    if (line.includes('LookupRows(') && !line.includes('"')) {
      issues.push({
        id: `lookuprows_no_filter_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('LookupRows(') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'LookupRows without proper filtering can return large datasets',
        rule: 'ampscript-lookuprows-filtering',
        category: 'performance',
        fixSuggestion: 'Add specific filter criteria to LookupRows function'
      })
    }

    // Check for data modification operations in loops
    const dataModOps = ['InsertData', 'UpdateData', 'UpsertData', 'DeleteData']
    dataModOps.forEach(op => {
      if (line.includes(op + '(') && line.includes('FOR')) {
        issues.push({
          id: `data_mod_in_loop_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf(op) + 1,
          severity: 'error' as ErrorSeverity,
          message: `${op} in loops can cause timeout and performance issues`,
          rule: 'ampscript-data-modification-loop',
          category: 'performance',
          fixSuggestion: `Batch ${op} operations outside loops when possible`
        })
      }
    })

    return issues
  }

  private validateSFMCSystemFunctions(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for proper CloudPagesURL usage
    if (line.includes('CloudPagesURL(') && !line.includes('https://')) {
      errors.push({
        id: `cloudpages_url_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('CloudPagesURL') + 1,
        severity: 'info' as ErrorSeverity,
        message: 'CloudPagesURL function generates secure HTTPS URLs',
        rule: 'ampscript-cloudpages-url',
        category: 'semantic',
        fixSuggestion: 'CloudPagesURL automatically provides HTTPS protocol'
      })
    }

    // Check for RequestParameter usage without validation
    if (line.includes('RequestParameter(') && !line.includes('Empty(') && !line.includes('IsNull(')) {
      errors.push({
        id: `request_parameter_validation_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('RequestParameter') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'RequestParameter values should be validated before use',
        rule: 'ampscript-request-parameter-validation',
        category: 'security',
        fixSuggestion: 'Validate RequestParameter with Empty() or IsNull() checks'
      })
    }

    // Check for AttributeValue with dynamic field names
    if (line.includes('AttributeValue(') && line.includes('Concat(')) {
      errors.push({
        id: `dynamic_attribute_value_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('AttributeValue') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Dynamic AttributeValue field names can impact performance',
        rule: 'ampscript-dynamic-attribute-value',
        category: 'performance',
        fixSuggestion: 'Use static field names when possible for better performance'
      })
    }

    return errors
  }

  private suggestPerformanceImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest Format over multiple Concat
    if ((line.match(/Concat\(/g) || []).length > 2) {
      suggestions.push({
        id: `format_suggestion_${lineNumber}`,
        type: 'performance',
        title: 'Use Format function instead of multiple Concat',
        description: 'Format function is more efficient for complex string formatting',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: '/* Use Format function: Format("{0} {1}", @firstName, @lastName) */',
        estimatedImprovement: '20-30% faster execution'
      })
    }

    return suggestions
  }

  private suggestCodeSimplifications(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest IIF for simple conditions
    if (line.includes('IF ') && !line.includes('ELSEIF') && !line.includes('ELSE')) {
      suggestions.push({
        id: `iif_suggestion_${lineNumber}`,
        type: 'readability',
        title: 'Consider using IIF for simple conditions',
        description: 'IIF function can simplify single-condition logic',
        impact: 'low',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: '/* Use IIF: SET @result = IIF(@condition, @trueValue, @falseValue) */',
        estimatedImprovement: 'Improved readability'
      })
    }

    return suggestions
  }

  private suggestBestPractices(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest error handling
    if (line.includes('HTTPGet') || line.includes('HTTPPost')) {
      suggestions.push({
        id: `error_handling_${lineNumber}`,
        type: 'maintainability',
        title: 'Add error handling for HTTP operations',
        description: 'HTTP operations should include error handling for robustness',
        impact: 'high',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: '/* Add error handling and response validation */',
        estimatedImprovement: 'Improved reliability'
      })
    }

    return suggestions
  }

  private applyFix(line: string, error: DebugError): string {
    switch (error.rule) {
      case 'ampscript-comparison':
        return line.replace(/=\s*([^=])/g, '== $1')
      case 'ampscript-delimiters':
        if (error.fixSuggestion?.includes('Add ]%%')) {
          return line + ' ]%%'
        } else if (error.fixSuggestion?.includes('Add %%[')) {
          return '%%[ ' + line
        }
        break
      default:
        return line
    }
    return line
  }
}