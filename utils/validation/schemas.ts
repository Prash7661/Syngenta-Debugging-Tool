// Validation schemas for request/response validation

import { Validators } from './validators'
import { 
  CodeGenerationRequest, 
  DebugRequest, 
  PageGenerationRequest,
  SFMCAuthRequest 
} from '../../types'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export class ValidationSchemas {
  // Code Generation Request validation
  static validateCodeGenerationRequest(request: any): ValidationResult {
    const errors: ValidationError[] = []

    // Validate prompt
    if (!request.prompt || typeof request.prompt !== 'string') {
      errors.push({
        field: 'prompt',
        message: 'Prompt is required and must be a string',
        code: 'REQUIRED_FIELD'
      })
    } else if (!Validators.isValidPrompt(request.prompt)) {
      errors.push({
        field: 'prompt',
        message: 'Prompt must be between 1 and 10000 characters',
        code: 'INVALID_LENGTH'
      })
    }

    // Validate language (optional)
    if (request.language && !Validators.isValidCodeLanguage(request.language)) {
      errors.push({
        field: 'language',
        message: 'Invalid code language',
        code: 'INVALID_VALUE'
      })
    }

    // Validate conversation history
    if (request.conversationHistory && !Array.isArray(request.conversationHistory)) {
      errors.push({
        field: 'conversationHistory',
        message: 'Conversation history must be an array',
        code: 'INVALID_TYPE'
      })
    }

    // Validate image (optional)
    if (request.image && typeof request.image !== 'string') {
      errors.push({
        field: 'image',
        message: 'Image must be a string (base64 or URL)',
        code: 'INVALID_TYPE'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Debug Request validation
  static validateDebugRequest(request: any): ValidationResult {
    const errors: ValidationError[] = []

    // Validate code
    if (!request.code || typeof request.code !== 'string') {
      errors.push({
        field: 'code',
        message: 'Code is required and must be a string',
        code: 'REQUIRED_FIELD'
      })
    } else if (!Validators.isValidCodeContent(request.code)) {
      errors.push({
        field: 'code',
        message: 'Code content is invalid or too long',
        code: 'INVALID_CONTENT'
      })
    }

    // Validate language
    if (!request.language || !Validators.isValidDebugLanguage(request.language)) {
      errors.push({
        field: 'language',
        message: 'Valid language is required',
        code: 'REQUIRED_FIELD'
      })
    }

    // Validate analysis level
    const validAnalysisLevels = ['syntax', 'performance', 'security', 'all']
    if (!request.analysisLevel || !validAnalysisLevels.includes(request.analysisLevel)) {
      errors.push({
        field: 'analysisLevel',
        message: 'Valid analysis level is required',
        code: 'INVALID_VALUE'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Page Generation Request validation
  static validatePageGenerationRequest(request: any): ValidationResult {
    const errors: ValidationError[] = []

    // Validate configuration
    if (!request.configuration || typeof request.configuration !== 'object') {
      errors.push({
        field: 'configuration',
        message: 'Configuration is required and must be an object',
        code: 'REQUIRED_FIELD'
      })
      return { isValid: false, errors }
    }

    const config = request.configuration

    // Validate page settings
    if (!config.pageSettings || typeof config.pageSettings !== 'object') {
      errors.push({
        field: 'configuration.pageSettings',
        message: 'Page settings are required',
        code: 'REQUIRED_FIELD'
      })
    } else {
      const pageSettings = config.pageSettings

      if (!pageSettings.pageName || typeof pageSettings.pageName !== 'string') {
        errors.push({
          field: 'configuration.pageSettings.pageName',
          message: 'Page name is required',
          code: 'REQUIRED_FIELD'
        })
      }

      if (!pageSettings.publishedURL || typeof pageSettings.publishedURL !== 'string') {
        errors.push({
          field: 'configuration.pageSettings.publishedURL',
          message: 'Published URL is required',
          code: 'REQUIRED_FIELD'
        })
      }

      if (!pageSettings.pageType || !Validators.isValidPageType(pageSettings.pageType)) {
        errors.push({
          field: 'configuration.pageSettings.pageType',
          message: 'Valid page type is required',
          code: 'INVALID_VALUE'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // SFMC Authentication Request validation
  static validateSFMCAuthRequest(request: any): ValidationResult {
    const errors: ValidationError[] = []

    // Validate client ID
    if (!request.clientId || typeof request.clientId !== 'string') {
      errors.push({
        field: 'clientId',
        message: 'Client ID is required',
        code: 'REQUIRED_FIELD'
      })
    } else if (!Validators.isValidSFMCClientId(request.clientId)) {
      errors.push({
        field: 'clientId',
        message: 'Invalid client ID format',
        code: 'INVALID_FORMAT'
      })
    }

    // Validate client secret
    if (!request.clientSecret || typeof request.clientSecret !== 'string') {
      errors.push({
        field: 'clientSecret',
        message: 'Client secret is required',
        code: 'REQUIRED_FIELD'
      })
    }

    // Validate subdomain
    if (!request.subdomain || typeof request.subdomain !== 'string') {
      errors.push({
        field: 'subdomain',
        message: 'Subdomain is required',
        code: 'REQUIRED_FIELD'
      })
    } else if (!Validators.isValidSFMCSubdomain(request.subdomain)) {
      errors.push({
        field: 'subdomain',
        message: 'Invalid subdomain format',
        code: 'INVALID_FORMAT'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // File Upload validation
  static validateFileUpload(file: any, allowedTypes: string[] = [], maxSize: number = 10 * 1024 * 1024): ValidationResult {
    const errors: ValidationError[] = []

    if (!file) {
      errors.push({
        field: 'file',
        message: 'File is required',
        code: 'REQUIRED_FIELD'
      })
      return { isValid: false, errors }
    }

    // Validate file size
    if (!Validators.isValidFileSize(file.size, maxSize)) {
      errors.push({
        field: 'file.size',
        message: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      })
    }

    // Validate file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push({
        field: 'file.type',
        message: `File type must be one of: ${allowedTypes.join(', ')}`,
        code: 'INVALID_FILE_TYPE'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Session validation
  static validateSession(session: any): ValidationResult {
    const errors: ValidationError[] = []

    if (!session) {
      errors.push({
        field: 'session',
        message: 'Session is required',
        code: 'REQUIRED_FIELD'
      })
      return { isValid: false, errors }
    }

    // Validate session ID
    if (!session.sessionId || !Validators.isValidSessionId(session.sessionId)) {
      errors.push({
        field: 'sessionId',
        message: 'Valid session ID is required',
        code: 'INVALID_SESSION_ID'
      })
    }

    // Check if session is expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      errors.push({
        field: 'expiresAt',
        message: 'Session has expired',
        code: 'SESSION_EXPIRED'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Generic object validation
  static validateRequired(obj: any, requiredFields: string[]): ValidationResult {
    const errors: ValidationError[] = []

    for (const field of requiredFields) {
      if (!obj || obj[field] === undefined || obj[field] === null || obj[field] === '') {
        errors.push({
          field,
          message: `${field} is required`,
          code: 'REQUIRED_FIELD'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Pagination validation
  static validatePagination(query: any): ValidationResult {
    const errors: ValidationError[] = []

    if (query.page !== undefined) {
      const page = parseInt(query.page)
      if (isNaN(page) || page < 1) {
        errors.push({
          field: 'page',
          message: 'Page must be a positive integer',
          code: 'INVALID_VALUE'
        })
      }
    }

    if (query.limit !== undefined) {
      const limit = parseInt(query.limit)
      if (isNaN(limit) || limit < 1 || limit > 100) {
        errors.push({
          field: 'limit',
          message: 'Limit must be between 1 and 100',
          code: 'INVALID_VALUE'
        })
      }
    }

    if (query.sortOrder !== undefined) {
      if (!['asc', 'desc'].includes(query.sortOrder.toLowerCase())) {
        errors.push({
          field: 'sortOrder',
          message: 'Sort order must be "asc" or "desc"',
          code: 'INVALID_VALUE'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}