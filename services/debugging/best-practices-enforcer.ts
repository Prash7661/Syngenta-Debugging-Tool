import { 
  CodeLanguage, 
  BestPracticeViolation, 
  BestPracticeCategory, 
  ErrorSeverity 
} from '../../types/debugging'

interface BestPracticeRule {
  id: string
  name: string
  category: BestPracticeCategory
  severity: ErrorSeverity
  pattern: RegExp
  message: string
  suggestion: string
  documentation?: string
  languages: CodeLanguage[]
}

export class BestPracticesEnforcer {
  private rules: BestPracticeRule[]

  constructor() {
    this.rules = this.initializeRules()
  }

  /**
   * Analyzes code for best practice violations
   */
  async enforceRules(code: string, language: CodeLanguage): Promise<BestPracticeViolation[]> {
    const violations: BestPracticeViolation[] = []
    const lines = code.split('\n')
    
    const applicableRules = this.rules.filter(rule => 
      rule.languages.includes(language) || rule.languages.includes('all' as CodeLanguage)
    )

    for (const rule of applicableRules) {
      const ruleViolations = await this.checkRule(rule, code, lines)
      violations.push(...ruleViolations)
    }

    // Sort violations by severity and line number
    return violations.sort((a, b) => {
      const severityOrder = { 'error': 3, 'warning': 2, 'info': 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return a.line - b.line
    })
  }

  /**
   * Gets all available rules for a specific language
   */
  getRulesForLanguage(language: CodeLanguage): BestPracticeRule[] {
    return this.rules.filter(rule => 
      rule.languages.includes(language) || rule.languages.includes('all' as CodeLanguage)
    )
  }

  /**
   * Adds a custom rule
   */
  addCustomRule(rule: BestPracticeRule): void {
    this.rules.push(rule)
  }

  /**
   * Removes a rule by ID
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId)
  }

  private async checkRule(rule: BestPracticeRule, code: string, lines: string[]): Promise<BestPracticeViolation[]> {
    const violations: BestPracticeViolation[] = []

    // Check each line for pattern matches
    lines.forEach((line, index) => {
      const matches = line.match(rule.pattern)
      if (matches) {
        matches.forEach(match => {
          const column = line.indexOf(match)
          violations.push({
            id: `${rule.id}_${index}_${column}`,
            rule: rule.name,
            category: rule.category,
            severity: rule.severity,
            message: rule.message,
            line: index + 1,
            column,
            suggestion: rule.suggestion,
            documentation: rule.documentation
          })
        })
      }
    })

    // Check entire code for multi-line patterns
    const globalMatches = code.match(rule.pattern)
    if (globalMatches && rule.pattern.global) {
      // For global patterns, find line numbers
      globalMatches.forEach(match => {
        const matchIndex = code.indexOf(match)
        const lineNumber = code.substring(0, matchIndex).split('\n').length
        const lineStart = code.lastIndexOf('\n', matchIndex) + 1
        const column = matchIndex - lineStart

        violations.push({
          id: `${rule.id}_global_${matchIndex}`,
          rule: rule.name,
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          line: lineNumber,
          column,
          suggestion: rule.suggestion,
          documentation: rule.documentation
        })
      })
    }

    return violations
  }

  private initializeRules(): BestPracticeRule[] {
    return [
      // Naming conventions
      {
        id: 'naming_camelcase_variables',
        name: 'Use camelCase for variables',
        category: 'naming',
        severity: 'warning',
        pattern: /\b(var|let|const)\s+[A-Z_][a-zA-Z0-9_]*\b/g,
        message: 'Variable names should use camelCase convention',
        suggestion: 'Use camelCase naming: myVariable instead of MyVariable or my_variable',
        languages: ['javascript', 'ssjs']
      },
      {
        id: 'naming_ampscript_variables',
        name: 'AMPScript variables should start with @',
        category: 'naming',
        severity: 'error',
        pattern: /\b(SET|VAR)\s+[^@]\w+/gi,
        message: 'AMPScript variables must start with @ symbol',
        suggestion: 'Prefix variable names with @: SET @myVariable = value',
        languages: ['ampscript']
      },
      {
        id: 'naming_sql_reserved_words',
        name: 'Avoid SQL reserved words as identifiers',
        category: 'naming',
        severity: 'warning',
        pattern: /\b(SELECT|FROM|WHERE|ORDER|GROUP|HAVING|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|INDEX|TABLE|DATABASE)\s+AS\s+(SELECT|FROM|WHERE|ORDER|GROUP|HAVING|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|INDEX|TABLE|DATABASE)\b/gi,
        message: 'Avoid using SQL reserved words as column or table aliases',
        suggestion: 'Use descriptive, non-reserved words for identifiers',
        languages: ['sql']
      },

      // Performance rules
      {
        id: 'performance_avoid_select_star',
        name: 'Avoid SELECT * in production code',
        category: 'performance',
        severity: 'warning',
        pattern: /SELECT\s+\*\s+FROM/gi,
        message: 'SELECT * can impact performance and maintainability',
        suggestion: 'Specify explicit column names instead of using SELECT *',
        documentation: 'https://docs.salesforce.com/sfmc/sql-best-practices',
        languages: ['sql']
      },
      {
        id: 'performance_ampscript_loops',
        name: 'Minimize AMPScript loops',
        category: 'performance',
        severity: 'info',
        pattern: /FOR\s+@\w+\s*=.*TO.*NEXT/gi,
        message: 'AMPScript loops can impact email rendering performance',
        suggestion: 'Consider using Lookup functions or preprocessing data when possible',
        languages: ['ampscript']
      },
      {
        id: 'performance_nested_loops',
        name: 'Avoid deeply nested loops',
        category: 'performance',
        severity: 'warning',
        pattern: /for\s*\([^}]*for\s*\([^}]*for\s*\(/gi,
        message: 'Deeply nested loops can cause performance issues',
        suggestion: 'Consider refactoring to reduce nesting or use more efficient algorithms',
        languages: ['javascript', 'ssjs']
      },

      // Security rules
      {
        id: 'security_sql_injection',
        name: 'Potential SQL injection vulnerability',
        category: 'security',
        severity: 'error',
        pattern: /['"].*\+.*['"]|EXEC\s*\(.*\+.*\)/gi,
        message: 'Potential SQL injection vulnerability detected',
        suggestion: 'Use parameterized queries or proper input sanitization',
        documentation: 'https://owasp.org/www-community/attacks/SQL_Injection',
        languages: ['sql', 'ssjs']
      },
      {
        id: 'security_xss_prevention',
        name: 'Potential XSS vulnerability',
        category: 'security',
        severity: 'error',
        pattern: /innerHTML\s*=.*\+|document\.write\s*\(.*\+/gi,
        message: 'Potential XSS vulnerability detected',
        suggestion: 'Use textContent or proper HTML encoding instead of innerHTML with concatenated strings',
        languages: ['javascript', 'ssjs']
      },
      {
        id: 'security_ampscript_output_encoding',
        name: 'Use proper output encoding in AMPScript',
        category: 'security',
        severity: 'warning',
        pattern: /%=.*@\w+.*=%/g,
        message: 'Consider using proper output encoding for user data',
        suggestion: 'Use HTMLEncode() or other appropriate encoding functions for user input',
        languages: ['ampscript']
      },

      // Maintainability rules
      {
        id: 'maintainability_function_length',
        name: 'Function is too long',
        category: 'maintainability',
        severity: 'warning',
        pattern: /function\s+\w+\s*\([^}]*\{[\s\S]{1000,}?\}/gi,
        message: 'Function is too long and may be hard to maintain',
        suggestion: 'Consider breaking down large functions into smaller, focused functions',
        languages: ['javascript', 'ssjs']
      },
      {
        id: 'maintainability_magic_numbers',
        name: 'Avoid magic numbers',
        category: 'maintainability',
        severity: 'info',
        pattern: /\b(?!0|1|2|10|100|1000)\d{3,}\b/g,
        message: 'Magic numbers make code harder to understand',
        suggestion: 'Define constants with descriptive names for numeric values',
        languages: ['javascript', 'ssjs', 'ampscript']
      },
      {
        id: 'maintainability_commented_code',
        name: 'Remove commented-out code',
        category: 'maintainability',
        severity: 'info',
        pattern: /\/\/.*(?:var|let|const|function|if|for|while)/gi,
        message: 'Commented-out code should be removed',
        suggestion: 'Remove commented code or use version control to track changes',
        languages: ['javascript', 'ssjs']
      },

      // Error handling rules
      {
        id: 'error_handling_try_catch',
        name: 'Use proper error handling',
        category: 'error_handling',
        severity: 'warning',
        pattern: /throw\s+new\s+Error\s*\(\s*['"]/gi,
        message: 'Consider using more specific error types',
        suggestion: 'Use specific error types or custom error classes for better error handling',
        languages: ['javascript', 'ssjs']
      },
      {
        id: 'error_handling_empty_catch',
        name: 'Avoid empty catch blocks',
        category: 'error_handling',
        severity: 'warning',
        pattern: /catch\s*\([^}]*\)\s*\{\s*\}/gi,
        message: 'Empty catch blocks hide errors',
        suggestion: 'Add proper error handling or at least log the error',
        languages: ['javascript', 'ssjs']
      },

      // Structure rules
      {
        id: 'structure_consistent_indentation',
        name: 'Use consistent indentation',
        category: 'structure',
        severity: 'info',
        pattern: /^[ ]{1,3}(?=\S)|^[ ]{5,7}(?=\S)|^[ ]{9,11}(?=\S)/gm,
        message: 'Inconsistent indentation detected',
        suggestion: 'Use consistent indentation (2 or 4 spaces, or tabs)',
        languages: ['javascript', 'ssjs', 'html', 'css']
      },
      {
        id: 'structure_trailing_whitespace',
        name: 'Remove trailing whitespace',
        category: 'structure',
        severity: 'info',
        pattern: /[ \t]+$/gm,
        message: 'Trailing whitespace detected',
        suggestion: 'Remove trailing spaces and tabs from line endings',
        languages: ['javascript', 'ssjs', 'html', 'css', 'sql', 'ampscript']
      },

      // Documentation rules
      {
        id: 'documentation_function_comments',
        name: 'Document complex functions',
        category: 'documentation',
        severity: 'info',
        pattern: /function\s+\w+\s*\([^}]*\{(?![\s\S]*\/\*|[\s\S]*\/\/)/gi,
        message: 'Complex functions should be documented',
        suggestion: 'Add JSDoc comments to describe function purpose, parameters, and return values',
        languages: ['javascript', 'ssjs']
      },

      // SFMC-specific rules
      {
        id: 'sfmc_ampscript_case_sensitivity',
        name: 'AMPScript function case consistency',
        category: 'maintainability',
        severity: 'info',
        pattern: /\b(lookup|lookuprows|rowcount|field|row)\s*\(/gi,
        message: 'Consider using consistent case for AMPScript functions',
        suggestion: 'Use consistent casing for AMPScript functions (e.g., Lookup vs lookup)',
        languages: ['ampscript']
      },
      {
        id: 'sfmc_ssjs_platform_load',
        name: 'Load Platform library in SSJS',
        category: 'structure',
        severity: 'warning',
        pattern: /Platform\./g,
        message: 'Ensure Platform library is properly loaded',
        suggestion: 'Add Platform.Load("Core","1") at the beginning of SSJS blocks',
        languages: ['ssjs']
      },
      {
        id: 'sfmc_data_extension_naming',
        name: 'Use descriptive Data Extension names',
        category: 'naming',
        severity: 'info',
        pattern: /FROM\s+['"](DE_|DataExtension_|Table_)/gi,
        message: 'Consider using more descriptive Data Extension names',
        suggestion: 'Use business-meaningful names for Data Extensions instead of generic prefixes',
        languages: ['sql']
      }
    ]
  }
}