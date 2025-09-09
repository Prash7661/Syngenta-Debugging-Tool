// SFMC-specific types and interfaces

// SFMC Authentication
export interface SFMCCredentials {
  clientId: string
  clientSecret: string
  subdomain: string
  accountId?: string
}

export interface SFMCAuthRequest {
  clientId: string
  clientSecret: string
  subdomain: string
}

export interface SFMCAuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  scope?: string
}

export interface AuthResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  error?: string
}

// SFMC Connection Management
export interface SFMCConnection {
  connectionId: string
  subdomain: string
  clientId: string
  encryptedClientSecret: string
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: Date
  connectionStatus: 'active' | 'expired' | 'error'
  lastUsed: Date
  permissions: SFMCPermission[]
}

export interface SFMCPermission {
  scope: string
  granted: boolean
  description: string
}

// SFMC Assets
export interface SFMCAsset {
  assetId: string
  name: string
  type: 'cloudpage' | 'email' | 'coderesource' | 'dataextension'
  content?: string
  metadata: Record<string, any>
  lastModified: Date
  createdBy: string
}

export interface DataExtension {
  objectID: string
  name: string
  description?: string
  fields: DataExtensionField[]
  isPrimaryKey: boolean
  isTestable: boolean
  isRetainable: boolean
  rowCount?: number
  createdDate: Date
  modifiedDate: Date
}

export interface DataExtensionField {
  name: string
  fieldType: 'Text' | 'Number' | 'Date' | 'Boolean' | 'EmailAddress' | 'Phone' | 'Decimal'
  maxLength?: number
  isPrimaryKey: boolean
  isRequired: boolean
  defaultValue?: string
  description?: string
}

export interface DataExtensionResponse {
  dataExtensions: DataExtension[]
  totalCount: number
}

// Cloud Page Deployment
export interface CloudPageDeployment {
  pageId: string
  name: string
  url: string
  content: string
  status: 'draft' | 'published' | 'archived'
  publishedDate?: Date
  lastModified: Date
}

export interface DeploymentResult {
  success: boolean
  pageId?: string
  url?: string
  error?: string
  warnings?: string[]
}

// AMPScript Validation
export interface ValidationResult {
  isValid: boolean
  errors: AMPScriptError[]
  warnings: AMPScriptWarning[]
  suggestions: AMPScriptSuggestion[]
}

export interface AMPScriptError {
  line: number
  column: number
  message: string
  code: string
  severity: 'error' | 'warning'
}

export interface AMPScriptWarning {
  line: number
  column: number
  message: string
  code: string
}

export interface AMPScriptSuggestion {
  line: number
  message: string
  suggestedCode?: string
  type: 'performance' | 'best_practice' | 'security'
}

// SFMC API Rate Limiting
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: Date
  retryAfter?: number
}

export interface RateLimitError extends Error {
  rateLimitInfo: RateLimitInfo
  retryAfter: number
}

// SFMC Business Units
export interface BusinessUnit {
  id: number
  name: string
  description?: string
  isActive: boolean
  parentId?: number
  accountType: string
}

// SFMC Journey Builder (for future integration)
export interface Journey {
  id: string
  name: string
  description?: string
  status: 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed'
  createdDate: Date
  modifiedDate: Date
  version: number
}

// Content Builder Assets
export interface ContentAsset {
  id: number
  name: string
  assetType: {
    id: number
    name: string
    displayName: string
  }
  content?: string
  data?: Record<string, any>
  category?: {
    id: number
    name: string
  }
  createdDate: Date
  modifiedDate: Date
}