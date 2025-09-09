import { CodeLanguage } from '../../../types/models'
import { AMPScriptValidator } from './ampscript-validator'
import { SSJSValidator } from './ssjs-validator'
import { SQLValidator } from './sql-validator'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
}

export interface ValidationError {
  line?: number
  column?: number
  message: string
  rule: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationWarning {
  line?: number
  column?: number
  message: string
  rule: string
}

export interface ValidationSuggestion {
  message: string
  type: 'performance' | 'best_practice' | 'security' | 'maintainability'
}

export class LanguageValidators {
  private ampscriptValidator: AMPScriptValidator
  private ssjsValidator: SSJSValidator
  private sqlValidator: SQLValidator

  constructor() {
    this.ampscriptValidator = new AMPScriptValidator()
    this.ssjsValidator = new SSJSValidator()
    this.sqlValidator = new SQLValidator()
  }

  async validate(code: string, language: CodeLanguage): Promise<ValidationResult> {
    switch (language) {
      case 'ampscript':
        return this.ampscriptValidator.validate(code)
      case 'ssjs':
        return this.ssjsValidator.validate(code)
      case 'sql':
        return this.sqlValidator.validate(code)
      default:
        return this.getDefaultValidation()
    }
  }

  private getDefaultValidation(): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    }
  }
}