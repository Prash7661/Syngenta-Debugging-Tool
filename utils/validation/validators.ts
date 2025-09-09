// Common validation functions

import { z } from 'zod';
import { CodeLanguage, DebugLanguage, PageType } from '../../types'
import { ValidationError } from '../errors/error-factory';

export class Validators {
  // Email validation
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // URL validation
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // SFMC subdomain validation
  static isValidSFMCSubdomain(subdomain: string): boolean {
    const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/
    return subdomainRegex.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 63
  }

  // Code language validation
  static isValidCodeLanguage(language: string): language is CodeLanguage {
    const validLanguages: CodeLanguage[] = ['sql', 'ampscript', 'ssjs', 'css', 'html', 'javascript', 'typescript']
    return validLanguages.includes(language as CodeLanguage)
  }

  // Debug language validation
  static isValidDebugLanguage(language: string): language is DebugLanguage {
    return this.isValidCodeLanguage(language)
  }

  // Page type validation
  static isValidPageType(type: string): type is PageType {
    const validTypes: PageType[] = ['landing', 'preference', 'profile', 'custom']
    return validTypes.includes(type as PageType)
  }

  // Session ID validation
  static isValidSessionId(sessionId: string): boolean {
    const sessionIdRegex = /^[a-zA-Z0-9_-]{20,128}$/
    return sessionIdRegex.test(sessionId)
  }

  // Request ID validation
  static isValidRequestId(requestId: string): boolean {
    const requestIdRegex = /^req_\d+_[a-zA-Z0-9]{9}$/
    return requestIdRegex.test(requestId)
  }

  // File size validation (in bytes)
  static isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize
  }

  // Image file type validation
  static isValidImageType(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    return validTypes.includes(mimeType.toLowerCase())
  }

  // Code content validation
  static isValidCodeContent(code: string, maxLength: number = 100000): boolean {
    return typeof code === 'string' && code.length > 0 && code.length <= maxLength
  }

  // Prompt validation
  static isValidPrompt(prompt: string, minLength: number = 1, maxLength: number = 10000): boolean {
    return typeof prompt === 'string' && 
           prompt.trim().length >= minLength && 
           prompt.length <= maxLength
  }

  // SFMC Client ID validation
  static isValidSFMCClientId(clientId: string): boolean {
    // SFMC client IDs are typically UUIDs or similar format
    const clientIdRegex = /^[a-zA-Z0-9-]{20,50}$/
    return clientIdRegex.test(clientId)
  }

  // Password strength validation
  static isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return strongPasswordRegex.test(password)
  }

  // JSON validation
  static isValidJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString)
      return true
    } catch {
      return false
    }
  }

  // YAML validation (basic check)
  static isValidYAML(yamlString: string): boolean {
    // Basic YAML structure check
    const lines = yamlString.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        // Check for basic YAML key-value structure
        if (!trimmed.includes(':') && !trimmed.startsWith('-')) {
          return false
        }
      }
    }
    return true
  }

  // HTML validation (basic check)
  static isValidHTML(html: string): boolean {
    // Basic HTML structure check
    const htmlRegex = /<[^>]+>/
    return htmlRegex.test(html)
  }

  // CSS validation (basic check)
  static isValidCSS(css: string): boolean {
    // Basic CSS structure check
    const cssRegex = /[^{}]*\{[^{}]*\}/
    return cssRegex.test(css) || css.trim() === ''
  }

  // AMPScript validation (basic check)
  static isValidAMPScript(ampscript: string): boolean {
    // Basic AMPScript structure check
    const ampscriptRegex = /%%\[.*?\]%%|%%=.*?=%%/
    return ampscriptRegex.test(ampscript) || ampscript.trim() === ''
  }

  // SSJS validation (basic check)
  static isValidSSJS(ssjs: string): boolean {
    // Basic SSJS/JavaScript structure check
    try {
      // Check for basic JavaScript syntax patterns
      const jsPatterns = [
        /var\s+\w+/,
        /function\s+\w+/,
        /\w+\s*=\s*.+/,
        /if\s*\(/,
        /for\s*\(/,
        /while\s*\(/
      ]
      
      return jsPatterns.some(pattern => pattern.test(ssjs)) || ssjs.trim() === ''
    } catch {
      return false
    }
  }

  // SQL validation (basic check)
  static isValidSQL(sql: string): boolean {
    // Basic SQL structure check
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i
    return sqlKeywords.test(sql) || sql.trim() === ''
  }

  // Sanitize input to prevent XSS
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
  }

  // Validate and sanitize file name
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255)
  }
}

/**
 * Validates input data against a Zod schema
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Validation failed',
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }
    throw error;
  }
}

/**
 * Validates request data against a Zod schema (alias for validateInput)
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return validateInput(schema, data);
}