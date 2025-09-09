import { LanguageValidator, DebugError, OptimizationSuggestion, ErrorSeverity } from '../../../types/debugging'

export class SQLValidator implements LanguageValidator {
  private readonly SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'INSERT', 'UPDATE', 'DELETE', 'CREATE',
    'ALTER', 'DROP', 'INDEX', 'TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION',
    'UNION', 'INTERSECT', 'EXCEPT', 'WITH', 'AS', 'DISTINCT', 'TOP', 'LIMIT'
  ]

  private readonly AGGREGATE_FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STDEV', 'VAR'
  ]

  private readonly SFMC_SPECIFIC_FUNCTIONS = [
    'DATEADD', 'DATEDIFF', 'DATEPART', 'GETDATE', 'CONVERT', 'CAST',
    'ISNULL', 'COALESCE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'CHARINDEX', 'PATINDEX', 'STUFF', 'REVERSE', 'REPLICATE', 'SPACE',
    'LTRIM', 'RTRIM', 'UPPER', 'LOWER', 'SUBSTRING', 'LEN', 'REPLACE'
  ]

  private readonly SFMC_SYSTEM_TABLES = [
    '_Subscribers', '_ListSubscribers', '_Bounce', '_Click', '_Open', '_Sent',
    '_Unsubscribe', '_SurveyResponse', '_ForwardedEmail', '_Job', '_JobSubscribers',
    '_BusinessUnitUnsubscribes', '_Complaint', '_FTAF', '_PushAddress', '_SMSSubscriptionLog',
    '_SMSMessageTracking', '_MobileSubscription', '_MobilePush', '_CloudPages',
    '_Journey', '_JourneyActivity', '_EnterpriseAttribute'
  ]

  private readonly PERFORMANCE_ANTI_PATTERNS = [
    'SELECT *', 'LIKE \'%', 'NOT IN', 'OR ', 'UNION ', 'DISTINCT'
  ]

  async validateSyntax(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Check for basic SQL syntax
      errors.push(...this.validateBasicSyntax(line, lineNumber))
      
      // Check for SELECT statement structure
      errors.push(...this.validateSelectStructure(line, lineNumber))
      
      // Check for JOIN syntax
      errors.push(...this.validateJoinSyntax(line, lineNumber))
      
      // Check for WHERE clause syntax
      errors.push(...this.validateWhereClause(line, lineNumber))
      
      // Check for GROUP BY and HAVING
      errors.push(...this.validateGroupByHaving(line, lineNumber))
      
      // Check for common syntax errors
      errors.push(...this.validateCommonSyntaxErrors(line, lineNumber))
      
      // Check SFMC-specific rules
      errors.push(...this.validateSFMCSpecificRules(line, lineNumber))
    }

    // Check for statement-level issues
    errors.push(...this.validateStatementStructure(code))

    return errors
  }

  async validateSemantics(code: string): Promise<DebugError[]> {
    const errors: DebugError[] = []
    const lines = code.split('\n')

    // Track table aliases and column references
    const tableAliases = new Map<string, string>()
    const columnReferences = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Track table aliases
      this.trackTableAliases(line, tableAliases)
      
      // Check for column references
      errors.push(...this.validateColumnReferences(line, lineNumber, tableAliases))
      
      // Check for aggregate function usage
      errors.push(...this.validateAggregateFunctions(line, lineNumber))
      
      // Check for subquery usage
      errors.push(...this.validateSubqueries(line, lineNumber))
      
      // Check for data type compatibility
      errors.push(...this.validateDataTypes(line, lineNumber))
    }

    return errors
  }

  async analyzePerformance(code: string): Promise<DebugError[]> {
    const issues: DebugError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Analyze SELECT performance
      issues.push(...this.analyzeSelectPerformance(line, lineNumber))
      
      // Analyze JOIN performance
      issues.push(...this.analyzeJoinPerformance(line, lineNumber))
      
      // Analyze WHERE clause performance
      issues.push(...this.analyzeWherePerformance(line, lineNumber))
      
      // Analyze indexing opportunities
      issues.push(...this.analyzeIndexingOpportunities(line, lineNumber))
      
      // Analyze query complexity
      issues.push(...this.analyzeQueryComplexity(line, lineNumber))
      
      // Analyze SFMC-specific performance
      issues.push(...this.analyzeSFMCPerformance(line, lineNumber))
    }

    // Analyze overall query structure
    issues.push(...this.analyzeOverallPerformance(code))

    return issues
  }

  async getOptimizationSuggestions(code: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Suggest query optimizations
      suggestions.push(...this.suggestQueryOptimizations(line, lineNumber))
      
      // Suggest indexing strategies
      suggestions.push(...this.suggestIndexingStrategies(line, lineNumber))
      
      // Suggest rewrite opportunities
      suggestions.push(...this.suggestQueryRewrites(line, lineNumber))
      
      // Suggest performance improvements
      suggestions.push(...this.suggestPerformanceImprovements(line, lineNumber))
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

  private validateBasicSyntax(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase().trim()

    // Check for missing semicolons at end of statements
    if (upperLine && 
        !upperLine.endsWith(';') && 
        !upperLine.endsWith(',') &&
        !line.trim().startsWith('--') &&
        (upperLine.includes('SELECT') || upperLine.includes('INSERT') || 
         upperLine.includes('UPDATE') || upperLine.includes('DELETE')) &&
        !upperLine.includes('(') && !upperLine.includes(')')) {
      
      errors.push({
        id: `missing_semicolon_${lineNumber}`,
        line: lineNumber,
        column: line.length,
        severity: 'warning' as ErrorSeverity,
        message: 'Consider adding semicolon at end of SQL statement',
        rule: 'sql-semicolon',
        category: 'syntax',
        fixSuggestion: 'Add semicolon at end of statement'
      })
    }

    // Check for unmatched parentheses
    const openParens = (line.match(/\(/g) || []).length
    const closeParens = (line.match(/\)/g) || []).length
    
    if (openParens !== closeParens) {
      errors.push({
        id: `unmatched_parens_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Unmatched parentheses in SQL statement',
        rule: 'sql-parentheses',
        category: 'syntax',
        fixSuggestion: openParens > closeParens ? 'Add missing closing parentheses' : 'Remove extra closing parentheses'
      })
    }

    return errors
  }

  private validateSelectStructure(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase().trim()

    // Check for SELECT without FROM (except for constants)
    if (upperLine.startsWith('SELECT') && !upperLine.includes('FROM') && 
        !upperLine.includes('GETDATE()') && !upperLine.includes('@@')) {
      errors.push({
        id: `select_without_from_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'SELECT statement without FROM clause - ensure this is intentional',
        rule: 'sql-select-from',
        category: 'semantic',
        fixSuggestion: 'Add FROM clause or verify if selecting constants'
      })
    }

    // Check for SELECT *
    if (upperLine.includes('SELECT *')) {
      errors.push({
        id: `select_star_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('SELECT *') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'SELECT * can impact performance - specify columns explicitly',
        rule: 'sql-select-star',
        category: 'performance',
        fixSuggestion: 'Replace SELECT * with specific column names'
      })
    }

    return errors
  }

  private validateJoinSyntax(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase().trim()

    // Check for JOIN without ON clause
    if ((upperLine.includes('JOIN') || upperLine.includes('INNER JOIN') || 
         upperLine.includes('LEFT JOIN') || upperLine.includes('RIGHT JOIN')) &&
        !upperLine.includes('ON') && !upperLine.includes('USING')) {
      
      errors.push({
        id: `join_without_on_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('JOIN') + 1,
        severity: 'error' as ErrorSeverity,
        message: 'JOIN statement missing ON clause',
        rule: 'sql-join-on',
        category: 'syntax',
        fixSuggestion: 'Add ON clause to specify join condition'
      })
    }

    // Check for old-style joins (comma-separated tables)
    if (upperLine.includes('FROM') && upperLine.includes(',') && 
        upperLine.includes('WHERE') && !upperLine.includes('JOIN')) {
      
      errors.push({
        id: `old_style_join_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Consider using explicit JOIN syntax instead of comma-separated tables',
        rule: 'sql-explicit-join',
        category: 'syntax',
        fixSuggestion: 'Replace comma-separated tables with explicit JOIN syntax'
      })
    }

    return errors
  }

  private validateWhereClause(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase().trim()

    // Check for WHERE 1=1 (often indicates dynamic SQL issues)
    if (upperLine.includes('WHERE 1=1') || upperLine.includes('WHERE 1 = 1')) {
      errors.push({
        id: `where_one_equals_one_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('WHERE') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'WHERE 1=1 may indicate dynamic SQL construction - review for necessity',
        rule: 'sql-where-one-equals-one',
        category: 'semantic',
        fixSuggestion: 'Remove WHERE 1=1 if not needed for dynamic SQL'
      })
    }

    // Check for potential SQL injection patterns
    if (line.includes("'") && line.includes('+') && line.includes('WHERE')) {
      errors.push({
        id: `potential_sql_injection_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Potential SQL injection vulnerability - use parameterized queries',
        rule: 'sql-injection-risk',
        category: 'security',
        fixSuggestion: 'Use parameterized queries instead of string concatenation'
      })
    }

    return errors
  }

  private validateGroupByHaving(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase().trim()

    // Check for HAVING without GROUP BY
    if (upperLine.includes('HAVING') && !upperLine.includes('GROUP BY')) {
      // This would need more context to be fully accurate
      errors.push({
        id: `having_without_group_by_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('HAVING') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'HAVING clause typically requires GROUP BY clause',
        rule: 'sql-having-group-by',
        category: 'semantic',
        fixSuggestion: 'Add GROUP BY clause or use WHERE instead of HAVING'
      })
    }

    return errors
  }

  private validateCommonSyntaxErrors(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase().trim()

    // Check for assignment in WHERE clause (= instead of ==)
    if (upperLine.includes('WHERE') && line.includes('=') && !line.includes('==') && 
        !line.includes('!=') && !line.includes('<>') && !line.includes('<=') && !line.includes('>=')) {
      
      // This is actually correct in SQL, but flag if it looks like a comparison issue
      if (line.match(/=\s*[a-zA-Z]/)) {
        errors.push({
          id: `assignment_style_${lineNumber}`,
          line: lineNumber,
          column: line.indexOf('=') + 1,
          severity: 'info' as ErrorSeverity,
          message: 'SQL uses single = for comparison (unlike some programming languages)',
          rule: 'sql-comparison-operator',
          category: 'syntax',
          fixSuggestion: 'Single = is correct for SQL comparisons'
        })
      }
    }

    return errors
  }

  private validateStatementStructure(code: string): DebugError[] {
    const errors: DebugError[] = []
    const upperCode = code.toUpperCase()

    // Check for aggregate functions without GROUP BY
    const hasAggregates = this.AGGREGATE_FUNCTIONS.some(func => upperCode.includes(func + '('))
    const hasGroupBy = upperCode.includes('GROUP BY')
    const hasNonAggregateColumns = this.hasNonAggregateColumnsInSelect(code)

    if (hasAggregates && hasNonAggregateColumns && !hasGroupBy) {
      errors.push({
        id: 'missing_group_by',
        line: 1,
        column: 1,
        severity: 'error' as ErrorSeverity,
        message: 'Query with aggregate functions and non-aggregate columns requires GROUP BY',
        rule: 'sql-aggregate-group-by',
        category: 'semantic',
        fixSuggestion: 'Add GROUP BY clause for non-aggregate columns'
      })
    }

    return errors
  }

  private trackTableAliases(line: string, aliases: Map<string, string>): void {
    const upperLine = line.toUpperCase()
    
    // Simple alias detection (table AS alias or table alias)
    const aliasMatch = upperLine.match(/(\w+)\s+(?:AS\s+)?(\w+)(?:\s|$|,)/g)
    if (aliasMatch) {
      aliasMatch.forEach(match => {
        const parts = match.trim().split(/\s+/)
        if (parts.length >= 2) {
          const table = parts[0]
          const alias = parts[parts.length - 1]
          if (alias !== 'AS') {
            aliases.set(alias, table)
          }
        }
      })
    }
  }

  private validateColumnReferences(line: string, lineNumber: number, aliases: Map<string, string>): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for ambiguous column references
    const columnRefs = line.match(/\b\w+\.\w+/g)
    if (columnRefs) {
      columnRefs.forEach(ref => {
        const [tableRef, column] = ref.split('.')
        if (!aliases.has(tableRef) && !this.isKnownTable(tableRef)) {
          errors.push({
            id: `unknown_table_alias_${lineNumber}`,
            line: lineNumber,
            column: line.indexOf(ref) + 1,
            severity: 'warning' as ErrorSeverity,
            message: `Unknown table alias or table name: ${tableRef}`,
            rule: 'sql-unknown-table-alias',
            category: 'semantic',
            fixSuggestion: `Verify table alias '${tableRef}' is defined`
          })
        }
      })
    }

    return errors
  }

  private validateAggregateFunctions(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase()

    // Check for COUNT(*) vs COUNT(column)
    if (upperLine.includes('COUNT(*)')) {
      errors.push({
        id: `count_star_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('COUNT(*)') + 1,
        severity: 'info' as ErrorSeverity,
        message: 'COUNT(*) counts all rows including NULLs - use COUNT(column) to exclude NULLs',
        rule: 'sql-count-star',
        category: 'semantic',
        fixSuggestion: 'Consider using COUNT(specific_column) if NULL exclusion is needed'
      })
    }

    return errors
  }

  private validateSubqueries(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for correlated subqueries (performance concern)
    if (line.includes('(SELECT') && line.includes('WHERE')) {
      errors.push({
        id: `subquery_performance_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('(SELECT') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Subqueries can impact performance - consider JOIN alternatives',
        rule: 'sql-subquery-performance',
        category: 'performance',
        fixSuggestion: 'Consider rewriting subquery as JOIN for better performance'
      })
    }

    return errors
  }

  private validateDataTypes(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    
    // Check for implicit type conversions
    if (line.includes('=') && line.match(/=\s*'\d+'/)) {
      errors.push({
        id: `implicit_conversion_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf('=') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Comparing numeric column with string literal may cause implicit conversion',
        rule: 'sql-implicit-conversion',
        category: 'performance',
        fixSuggestion: 'Use numeric literal without quotes for numeric comparisons'
      })
    }

    return errors
  }

  private analyzeSelectPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    const upperLine = line.toUpperCase()

    // Check for DISTINCT usage
    if (upperLine.includes('SELECT DISTINCT')) {
      issues.push({
        id: `distinct_performance_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('DISTINCT') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'DISTINCT can be expensive - ensure it\'s necessary',
        rule: 'sql-distinct-performance',
        category: 'performance',
        fixSuggestion: 'Verify DISTINCT is necessary or use GROUP BY if appropriate'
      })
    }

    return issues
  }

  private analyzeJoinPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    const upperLine = line.toUpperCase()

    // Check for Cartesian products
    if (upperLine.includes('CROSS JOIN')) {
      issues.push({
        id: `cartesian_product_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('CROSS JOIN') + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'CROSS JOIN creates Cartesian product - ensure this is intentional',
        rule: 'sql-cartesian-product',
        category: 'performance',
        fixSuggestion: 'Verify CROSS JOIN is intentional or add proper JOIN conditions'
      })
    }

    return issues
  }

  private analyzeWherePerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    const upperLine = line.toUpperCase()

    // Check for functions in WHERE clause
    if (upperLine.includes('WHERE') && 
        (upperLine.includes('UPPER(') || upperLine.includes('LOWER(') || 
         upperLine.includes('SUBSTRING(') || upperLine.includes('LEFT('))) {
      
      issues.push({
        id: `function_in_where_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Functions in WHERE clause can prevent index usage',
        rule: 'sql-function-in-where',
        category: 'performance',
        fixSuggestion: 'Consider restructuring to avoid functions on indexed columns'
      })
    }

    // Check for LIKE with leading wildcard
    if (upperLine.includes('LIKE') && line.includes("'%")) {
      issues.push({
        id: `leading_wildcard_${lineNumber}`,
        line: lineNumber,
        column: line.indexOf("'%") + 1,
        severity: 'warning' as ErrorSeverity,
        message: 'LIKE with leading wildcard cannot use indexes efficiently',
        rule: 'sql-leading-wildcard',
        category: 'performance',
        fixSuggestion: 'Avoid leading wildcards in LIKE patterns when possible'
      })
    }

    return issues
  }

  private analyzeIndexingOpportunities(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    const upperLine = line.toUpperCase()

    // Check for WHERE clauses that could benefit from indexes
    if (upperLine.includes('WHERE') && !upperLine.includes('INDEX')) {
      issues.push({
        id: `indexing_opportunity_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'info' as ErrorSeverity,
        message: 'Consider indexing columns used in WHERE clause for better performance',
        rule: 'sql-indexing-opportunity',
        category: 'performance',
        fixSuggestion: 'Create indexes on frequently queried columns'
      })
    }

    return issues
  }

  private analyzeQueryComplexity(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    
    // Count nested subqueries
    const subqueryCount = (line.match(/\(SELECT/gi) || []).length
    if (subqueryCount > 2) {
      issues.push({
        id: `complex_query_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Complex nested queries can be hard to maintain and optimize',
        rule: 'sql-query-complexity',
        category: 'performance',
        fixSuggestion: 'Consider breaking complex query into simpler parts or using CTEs'
      })
    }

    return issues
  }

  private analyzeOverallPerformance(code: string): DebugError[] {
    const issues: DebugError[] = []
    const upperCode = code.toUpperCase()

    // Check for missing LIMIT/TOP in potentially large result sets
    if (upperCode.includes('SELECT') && !upperCode.includes('LIMIT') && 
        !upperCode.includes('TOP') && !upperCode.includes('WHERE')) {
      
      issues.push({
        id: 'missing_limit',
        line: 1,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Query without WHERE clause or LIMIT may return large result sets',
        rule: 'sql-missing-limit',
        category: 'performance',
        fixSuggestion: 'Add WHERE clause or LIMIT to control result set size'
      })
    }

    return issues
  }

  private suggestQueryOptimizations(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const upperLine = line.toUpperCase()

    // Suggest EXISTS instead of IN with subquery
    if (upperLine.includes('IN (SELECT')) {
      suggestions.push({
        id: `exists_instead_of_in_${lineNumber}`,
        type: 'performance',
        title: 'Use EXISTS instead of IN with subquery',
        description: 'EXISTS can be more efficient than IN with subqueries',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: line.replace(/IN \(SELECT/gi, 'EXISTS (SELECT 1 FROM'),
        estimatedImprovement: '10-30% performance improvement'
      })
    }

    return suggestions
  }

  private suggestIndexingStrategies(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const upperLine = line.toUpperCase()

    // Suggest composite indexes for multi-column WHERE clauses
    if (upperLine.includes('WHERE') && (line.match(/AND/gi) || []).length > 1) {
      suggestions.push({
        id: `composite_index_${lineNumber}`,
        type: 'performance',
        title: 'Consider composite index for multi-column WHERE clause',
        description: 'Composite indexes can improve performance for multi-column filters',
        impact: 'high',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: '-- CREATE INDEX idx_composite ON table (col1, col2, col3)',
        estimatedImprovement: '50-80% query performance improvement'
      })
    }

    return suggestions
  }

  private suggestQueryRewrites(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const upperLine = line.toUpperCase()

    // Suggest CTE for complex subqueries
    if ((line.match(/\(SELECT/gi) || []).length > 1) {
      suggestions.push({
        id: `cte_suggestion_${lineNumber}`,
        type: 'readability',
        title: 'Consider using Common Table Expression (CTE)',
        description: 'CTEs can improve readability and maintainability of complex queries',
        impact: 'medium',
        effort: 'medium',
        beforeCode: line.trim(),
        afterCode: 'WITH cte_name AS (SELECT ...) SELECT ... FROM cte_name',
        estimatedImprovement: 'Improved query readability and maintainability'
      })
    }

    return suggestions
  }

  private suggestPerformanceImprovements(line: string, lineNumber: number): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    
    // Suggest specific column selection instead of SELECT *
    if (line.toUpperCase().includes('SELECT *')) {
      suggestions.push({
        id: `specific_columns_${lineNumber}`,
        type: 'performance',
        title: 'Select specific columns instead of SELECT *',
        description: 'Selecting only needed columns reduces data transfer and improves performance',
        impact: 'medium',
        effort: 'low',
        beforeCode: line.trim(),
        afterCode: 'SELECT col1, col2, col3 FROM table',
        estimatedImprovement: '20-40% performance improvement'
      })
    }

    return suggestions
  }

  private applyFix(line: string, error: DebugError): string {
    switch (error.rule) {
      case 'sql-semicolon':
        return line.trim() + ';'
      case 'sql-select-star':
        return line.replace(/SELECT \*/gi, 'SELECT col1, col2 /* specify columns */')
      case 'sql-injection-risk':
        return '-- ' + line + ' -- SECURITY: Use parameterized queries'
      default:
        return line
    }
  }

  private hasNonAggregateColumnsInSelect(code: string): boolean {
    // Simplified check - would need more sophisticated parsing for accuracy
    const selectMatch = code.match(/SELECT\s+(.*?)\s+FROM/i)
    if (!selectMatch) return false
    
    const selectClause = selectMatch[1]
    const hasNonAggregate = !this.AGGREGATE_FUNCTIONS.every(func => 
      !selectClause.toUpperCase().includes(func + '(')
    )
    
    return hasNonAggregate && selectClause.includes(',')
  }

  private isKnownTable(tableName: string): boolean {
    return this.SFMC_SYSTEM_TABLES.includes(tableName)
  }

  private validateSFMCSpecificRules(line: string, lineNumber: number): DebugError[] {
    const errors: DebugError[] = []
    const upperLine = line.toUpperCase()

    // Check for system table usage without proper filtering
    this.SFMC_SYSTEM_TABLES.forEach(table => {
      if (upperLine.includes(table.toUpperCase()) && upperLine.includes('SELECT') && 
          !upperLine.includes('WHERE') && !upperLine.includes('TOP')) {
        errors.push({
          id: `system_table_no_filter_${lineNumber}`,
          line: lineNumber,
          column: upperLine.indexOf(table.toUpperCase()) + 1,
          severity: 'warning' as ErrorSeverity,
          message: `System table ${table} should include WHERE clause or TOP to limit results`,
          rule: 'sfmc-system-table-filtering',
          category: 'performance',
          fixSuggestion: `Add WHERE clause or TOP clause when querying ${table}`
        })
      }
    })

    // Check for inefficient date filtering on system tables
    if (upperLine.includes('_') && upperLine.includes('WHERE') && 
        upperLine.includes('EVENTDATE') && !upperLine.includes('DATEADD')) {
      errors.push({
        id: `inefficient_date_filter_${lineNumber}`,
        line: lineNumber,
        column: 1,
        severity: 'warning' as ErrorSeverity,
        message: 'Consider using DATEADD for date range filtering on system tables',
        rule: 'sfmc-date-filtering',
        category: 'performance',
        fixSuggestion: 'Use DATEADD(DAY, -30, GETDATE()) for relative date filtering'
      })
    }

    // Check for subscriber key vs email address usage
    if (upperLine.includes('EMAILADDRESS') && upperLine.includes('WHERE') && 
        !upperLine.includes('SUBSCRIBERKEY')) {
      errors.push({
        id: `email_vs_subscriber_key_${lineNumber}`,
        line: lineNumber,
        column: upperLine.indexOf('EMAILADDRESS') + 1,
        severity: 'info' as ErrorSeverity,
        message: 'Consider using SubscriberKey instead of EmailAddress for better performance',
        rule: 'sfmc-subscriber-key-usage',
        category: 'performance',
        fixSuggestion: 'Use SubscriberKey when possible as it is the primary key'
      })
    }

    return errors
  }

  private analyzeSFMCPerformance(line: string, lineNumber: number): DebugError[] {
    const issues: DebugError[] = []
    const upperLine = line.toUpperCase()

    // Check for performance anti-patterns
    this.PERFORMANCE_ANTI_PATTERNS.forEach(pattern => {
      if (upperLine.includes(pattern)) {
        let severity: ErrorSeverity = 'warning'
        let message = `Performance concern: ${pattern} detected`
        let suggestion = 'Consider alternative approaches'

        switch (pattern) {
          case 'SELECT *':
            message = 'SELECT * can impact performance in SFMC'
            suggestion = 'Specify only needed columns'
            break
          case 'LIKE \'%':
            message = 'Leading wildcard LIKE patterns cannot use indexes'
            suggestion = 'Avoid leading wildcards when possible'
            severity = 'error'
            break
          case 'NOT IN':
            message = 'NOT IN can be inefficient with large datasets'
            suggestion = 'Consider using NOT EXISTS or LEFT JOIN with NULL check'
            break
          case 'OR ':
            message = 'OR conditions can prevent index usage'
            suggestion = 'Consider using UNION or restructuring the query'
            break
        }

        issues.push({
          id: `sfmc_performance_${lineNumber}_${pattern.replace(/[^a-zA-Z0-9]/g, '_')}`,
          line: lineNumber,
          column: upperLine.indexOf(pattern) + 1,
          severity,
          message,
          rule: 'sfmc-performance-optimization',
          category: 'performance',
          fixSuggestion: suggestion
        })
      }
    })

    return issues
  }
}