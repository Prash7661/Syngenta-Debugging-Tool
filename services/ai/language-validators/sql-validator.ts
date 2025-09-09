import { ValidationResult, ValidationError, ValidationWarning, ValidationSuggestion } from './language-validators'

export class SQLValidator {
  private readonly SFMC_FUNCTIONS = [
    'GETDATE', 'DATEADD', 'DATEDIFF', 'YEAR', 'MONTH', 'DAY', 'CONVERT', 'CAST', 'FORMAT',
    'LEN', 'LEFT', 'RIGHT', 'SUBSTRING', 'CHARINDEX', 'REPLACE', 'UPPER', 'LOWER', 
    'LTRIM', 'RTRIM', 'CONCAT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ISNULL', 'COALESCE',
    'ROUND', 'CEILING', 'FLOOR', 'ABS', 'POWER', 'SQRT',
    'TRY_CAST', 'TRY_CONVERT', 'PARSE', 'TRY_PARSE'
  ]

  private readonly RESERVED_WORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'INSERT', 'INTO', 'VALUES',
    'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'NOT', 'NULL',
    'DEFAULT', 'CHECK', 'UNIQUE', 'AND', 'OR', 'IN', 'BETWEEN', 'LIKE',
    'IS', 'EXISTS', 'ALL', 'ANY', 'SOME', 'UNION', 'INTERSECT', 'EXCEPT'
  ]

  async validate(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []

    // Clean and normalize the SQL
    const normalizedSQL = this.normalizeSQL(code)
    const lines = normalizedSQL.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // Skip empty lines and comments
      if (this.isEmptyOrComment(line)) continue

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
    this.validateGlobalStructure(normalizedSQL, errors, warnings, suggestions)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  private normalizeSQL(sql: string): string {
    // Remove extra whitespace and normalize line endings
    return sql
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private isEmptyOrComment(line: string): boolean {
    const trimmed = line.trim()
    return trimmed === '' || trimmed.startsWith('--') || trimmed.startsWith('/*')
  }

  private validateSyntax(line: string, lineNumber: number, errors: ValidationError[]): void {
    // Check for basic SQL syntax errors
    
    // Unmatched parentheses
    const openParens = (line.match(/\(/g) || []).length
    const closeParens = (line.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      errors.push({
        line: lineNumber,
        message: 'Unmatched parentheses detected.',
        rule: 'sql-parentheses-mismatch',
        severity: 'error'
      })
    }

    // Unmatched quotes
    const singleQuotes = (line.match(/'/g) || []).length
    const doubleQuotes = (line.match(/"/g) || []).length
    if (singleQuotes % 2 !== 0) {
      errors.push({
        line: lineNumber,
        message: 'Unmatched single quotes detected.',
        rule: 'sql-quote-mismatch',
        severity: 'error'
      })
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push({
        line: lineNumber,
        message: 'Unmatched double quotes detected.',
        rule: 'sql-quote-mismatch',
        severity: 'error'
      })
    }

    // Check for invalid function names
    const functionCalls = line.match(/\b([A-Z_][A-Z0-9_]*)\s*\(/gi)
    if (functionCalls) {
      functionCalls.forEach(call => {
        const functionName = call.replace(/\s*\($/, '').toUpperCase()
        if (!this.SFMC_FUNCTIONS.includes(functionName) && !this.isCommonSQLFunction(functionName)) {
          errors.push({
            line: lineNumber,
            message: `Unknown or unsupported SQL function: ${functionName}`,
            rule: 'sql-unknown-function',
            severity: 'error'
          })
        }
      })
    }

    // Check for missing FROM clause in SELECT statements
    if (line.toUpperCase().includes('SELECT') && 
        !line.toUpperCase().includes('FROM') && 
        !line.includes('(')) {
      errors.push({
        line: lineNumber,
        message: 'SELECT statement missing FROM clause.',
        rule: 'sql-missing-from',
        severity: 'error'
      })
    }
  }

  private checkBestPractices(
    line: string, 
    lineNumber: number, 
    warnings: ValidationWarning[], 
    suggestions: ValidationSuggestion[]
  ): void {
    // Check for SELECT *
    if (line.toUpperCase().includes('SELECT *')) {
      warnings.push({
        line: lineNumber,
        message: 'Avoid using SELECT *. Specify column names explicitly.',
        rule: 'sql-select-star'
      })
      
      suggestions.push({
        message: 'Specify only the columns you need to improve query performance and maintainability.',
        type: 'performance'
      })
    }

    // Check for missing TOP clause
    if (line.toUpperCase().includes('SELECT') && 
        !line.toUpperCase().includes('TOP') && 
        !line.toUpperCase().includes('WHERE')) {
      warnings.push({
        line: lineNumber,
        message: 'Consider using TOP clause to limit results and prevent timeouts.',
        rule: 'sql-missing-top'
      })
    }

    // Check for proper table aliasing
    if (line.toUpperCase().includes('JOIN') && !line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\s+[a-zA-Z]\b/)) {
      suggestions.push({
        message: 'Use table aliases in JOIN statements for better readability.',
        type: 'maintainability'
      })
    }

    // Check for proper indexing hints
    if (line.toUpperCase().includes('WHERE') && 
        line.match(/=\s*'[^']*'/) && 
        !line.toUpperCase().includes('INDEX')) {
      suggestions.push({
        message: 'Ensure WHERE clause conditions use indexed columns for better performance.',
        type: 'performance'
      })
    }

    // Check for proper date handling
    if (line.match(/\d{4}-\d{2}-\d{2}/) && !line.toUpperCase().includes('CONVERT')) {
      suggestions.push({
        message: 'Use CONVERT or CAST functions for explicit date formatting.',
        type: 'best_practice'
      })
    }
  }

  private checkSecurity(
    line: string, 
    lineNumber: number, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    // Check for potential SQL injection patterns
    if (line.includes("' +") || line.includes("+ '")) {
      errors.push({
        line: lineNumber,
        message: 'Potential SQL injection vulnerability detected. Use parameterized queries.',
        rule: 'sql-injection-risk',
        severity: 'error'
      })
    }

    // Check for dynamic SQL construction
    if (line.toUpperCase().includes('EXEC') && line.includes('+')) {
      errors.push({
        line: lineNumber,
        message: 'Dynamic SQL execution with string concatenation is dangerous.',
        rule: 'sql-dynamic-execution',
        severity: 'error'
      })
    }

    // Check for exposed sensitive data
    if (line.match(/(password|secret|key|token|ssn|credit)/i) && 
        line.toUpperCase().includes('SELECT')) {
      warnings.push({
        line: lineNumber,
        message: 'Avoid selecting sensitive data directly. Consider data masking.',
        rule: 'sql-sensitive-data'
      })
    }
  }

  private checkPerformance(
    line: string, 
    lineNumber: number, 
    warnings: ValidationWarning[], 
    suggestions: ValidationSuggestion[]
  ): void {
    // Check for inefficient LIKE patterns
    if (line.toUpperCase().includes('LIKE') && line.includes("'%")) {
      warnings.push({
        line: lineNumber,
        message: 'Leading wildcards in LIKE patterns prevent index usage.',
        rule: 'sql-inefficient-like'
      })
      
      suggestions.push({
        message: 'Avoid leading wildcards in LIKE patterns. Consider full-text search for better performance.',
        type: 'performance'
      })
    }

    // Check for missing WHERE clauses
    if ((line.toUpperCase().includes('UPDATE') || line.toUpperCase().includes('DELETE')) && 
        !line.toUpperCase().includes('WHERE')) {
      warnings.push({
        line: lineNumber,
        message: 'UPDATE/DELETE without WHERE clause affects all rows.',
        rule: 'sql-missing-where'
      })
    }

    // Check for inefficient subqueries
    if (line.toUpperCase().includes('IN (SELECT')) {
      suggestions.push({
        message: 'Consider using EXISTS instead of IN with subqueries for better performance.',
        type: 'performance'
      })
    }

    // Check for DISTINCT usage
    if (line.toUpperCase().includes('DISTINCT') && line.toUpperCase().includes('ORDER BY')) {
      suggestions.push({
        message: 'DISTINCT with ORDER BY can be expensive. Ensure proper indexing.',
        type: 'performance'
      })
    }

    // Check for complex expressions in WHERE clause
    if (line.toUpperCase().includes('WHERE') && 
        (line.includes('SUBSTRING') || line.includes('UPPER') || line.includes('LOWER'))) {
      suggestions.push({
        message: 'Functions in WHERE clause prevent index usage. Consider computed columns.',
        type: 'performance'
      })
    }
  }

  private validateGlobalStructure(
    sql: string, 
    errors: ValidationError[], 
    warnings: ValidationWarning[], 
    suggestions: ValidationSuggestion[]
  ): void {
    const upperSQL = sql.toUpperCase()

    // Check for proper query structure
    if (upperSQL.includes('SELECT') && !upperSQL.includes('FROM')) {
      errors.push({
        message: 'SELECT statement must include FROM clause.',
        rule: 'sql-structure',
        severity: 'error'
      })
    }

    // Check for SFMC-specific limitations
    if (sql.length > 4000) {
      warnings.push({
        message: 'Query is very long. SFMC has limitations on query complexity.',
        rule: 'sql-length-limit'
      })
    }

    // Check for proper JOIN usage
    const joinCount = (upperSQL.match(/JOIN/g) || []).length
    if (joinCount > 5) {
      warnings.push({
        message: 'Multiple JOINs can impact performance. Consider query optimization.',
        rule: 'sql-join-complexity'
      })
    }

    // Check for proper error handling patterns
    if (upperSQL.includes('TRY_CAST') || upperSQL.includes('TRY_CONVERT')) {
      suggestions.push({
        message: 'Good use of TRY_ functions for safe data conversion.',
        type: 'best_practice'
      })
    }

    // Check for SFMC best practices
    if (!upperSQL.includes('TOP') && upperSQL.includes('SELECT')) {
      suggestions.push({
        message: 'Consider using TOP clause to limit results and prevent query timeouts in SFMC.',
        type: 'best_practice'
      })
    }

    // Check for proper commenting
    const commentCount = (sql.match(/--.*|\/\*[\s\S]*?\*\//g) || []).length
    const statementCount = (sql.match(/;/g) || []).length + 1
    
    if (statementCount > 3 && commentCount === 0) {
      suggestions.push({
        message: 'Add comments to explain complex SQL logic.',
        type: 'maintainability'
      })
    }
  }

  private isCommonSQLFunction(functionName: string): boolean {
    const commonFunctions = [
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
      'LEAD', 'LAG', 'FIRST_VALUE', 'LAST_VALUE',
      'PARTITION', 'OVER', 'WINDOW'
    ]
    
    return commonFunctions.includes(functionName.toUpperCase())
  }
}