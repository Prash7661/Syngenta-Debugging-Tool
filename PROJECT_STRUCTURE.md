# SFMC Development Suite - Project Structure

This document outlines the enhanced project structure and core interfaces implemented for the SFMC Development Suite.

## Directory Structure

```
├── types/                          # TypeScript type definitions
│   ├── index.ts                   # Main type exports
│   ├── models.ts                  # Core data models
│   ├── api.ts                     # API request/response interfaces
│   ├── sfmc.ts                    # SFMC-specific types
│   ├── ai.ts                      # AI service types
│   ├── errors.ts                  # Error handling types
│   └── services.ts                # Service layer interfaces
│
├── services/                       # Service layer implementation
│   ├── index.ts                   # Service exports
│   ├── base/                      # Base service classes
│   │   ├── index.ts
│   │   └── base-service.ts        # Abstract base service
│   ├── factory/                   # Service factory pattern
│   │   ├── index.ts
│   │   └── service-factory.ts     # Service creation factory
│   └── registry/                  # Service registry pattern
│       ├── index.ts
│       └── service-registry.ts    # Service dependency management
│
├── utils/                         # Utility functions and classes
│   ├── index.ts                   # Utility exports
│   ├── errors/                    # Error handling utilities
│   │   ├── index.ts
│   │   ├── error-factory.ts       # Standardized error creation
│   │   ├── error-handler.ts       # Centralized error handling
│   │   ├── circuit-breaker.ts     # Circuit breaker pattern
│   │   ├── retry.ts               # Retry mechanisms
│   │   └── error-mapper.ts        # Error format conversion
│   ├── validation/                # Input validation utilities
│   │   ├── index.ts
│   │   ├── validators.ts          # Common validation functions
│   │   └── schemas.ts             # Request validation schemas
│   ├── crypto/                    # Cryptographic utilities
│   │   ├── index.ts
│   │   ├── encryption.ts          # Data encryption/decryption
│   │   └── hashing.ts             # Hashing and integrity
│   └── http/                      # HTTP utilities
│       ├── index.ts
│       ├── client.ts              # HTTP client with retry
│       ├── middleware.ts          # API middleware functions
│       └── response.ts            # Response formatting utilities
│
├── app/                           # Next.js app directory (existing)
├── components/                    # React components (existing)
├── hooks/                         # React hooks (existing)
├── lib/                           # Library utilities (existing)
└── public/                        # Static assets (existing)
```

## Core Type Definitions

### Data Models (`types/models.ts`)
- **UserSession**: User session management with preferences and conversation history
- **Message & CodeBlock**: Conversation and code generation structures
- **CodeAnalysisResult**: Comprehensive code analysis with metrics and suggestions
- **PageConfiguration**: Cloud page generation configuration
- **PerformanceMetrics**: Code performance analysis data

### API Interfaces (`types/api.ts`)
- **CodeGenerationRequest/Response**: AI code generation API contracts
- **DebugRequest/Response**: Code debugging API contracts
- **PageGenerationRequest/Response**: Cloud page generation API contracts
- **ApiResponse**: Standardized API response format with error handling

### SFMC Integration (`types/sfmc.ts`)
- **SFMCCredentials & SFMCConnection**: Authentication and connection management
- **DataExtension**: SFMC data extension structures
- **CloudPageDeployment**: Cloud page deployment tracking
- **ValidationResult**: AMPScript and code validation results

### AI Services (`types/ai.ts`)
- **AICodeGenerationRequest/Response**: AI service integration contracts
- **AIAnalysisRequest/Response**: Code analysis through AI
- **TokenUsage & AIUsageMetrics**: Usage tracking and cost management
- **CachedAIResponse**: Response caching for performance

### Error Handling (`types/errors.ts`)
- **ApplicationError**: Base error structure with context
- **ErrorType**: Comprehensive error classification system
- **CircuitBreakerConfig**: Resilience pattern configuration
- **RetryConfig**: Retry mechanism configuration

### Service Interfaces (`types/services.ts`)
- **BaseService**: Common service interface with health checks
- **IAICodeGenerationService**: AI service contract
- **ISFMCIntegrationService**: SFMC integration contract
- **ISessionService, ICacheService, etc.**: Supporting service contracts

## Service Layer Architecture

### Base Service (`services/base/base-service.ts`)
Abstract base class providing:
- Initialization and shutdown lifecycle
- Health check implementation
- Error handling and logging
- Common service patterns

### Service Factory (`services/factory/service-factory.ts`)
Singleton factory for creating service instances:
- Dependency injection support
- Service caching and reuse
- Configuration management
- Service lifecycle management

### Service Registry (`services/registry/service-registry.ts`)
Central registry for service management:
- Service registration and discovery
- Dependency resolution and ordering
- Health monitoring across services
- Graceful shutdown coordination

## Error Handling System

### Error Factory (`utils/errors/error-factory.ts`)
Standardized error creation:
- Type-specific error constructors
- Consistent error structure
- Request ID generation
- Context preservation

### Error Handler (`utils/errors/error-handler.ts`)
Centralized error processing:
- Error normalization and logging
- User-friendly message mapping
- Error reporting integration
- Severity classification

### Circuit Breaker (`utils/errors/circuit-breaker.ts`)
Resilience pattern implementation:
- Failure threshold monitoring
- Automatic recovery attempts
- Service protection from cascading failures
- Metrics and monitoring

### Retry Manager (`utils/errors/retry.ts`)
Intelligent retry mechanisms:
- Exponential backoff with jitter
- Configurable retry policies
- Error type-based retry decisions
- Decorator pattern support

## Validation System

### Validators (`utils/validation/validators.ts`)
Common validation functions:
- Input sanitization and security
- Format validation (email, URL, etc.)
- SFMC-specific validation
- File and content validation

### Validation Schemas (`utils/validation/schemas.ts`)
Request validation schemas:
- API request validation
- File upload validation
- Session validation
- Pagination validation

## Cryptographic Utilities

### Encryption (`utils/crypto/encryption.ts`)
Secure data handling:
- AES-256-GCM encryption
- SFMC credential encryption
- JWT token encryption
- Secure random generation

### Hashing (`utils/crypto/hashing.ts`)
Data integrity and security:
- SHA-256/512 hashing
- Password hashing with PBKDF2
- Content fingerprinting
- API request signatures

## HTTP Utilities

### HTTP Client (`utils/http/client.ts`)
Enhanced HTTP client:
- Automatic retry with backoff
- Circuit breaker integration
- Specialized SFMC and AI clients
- Request/response interceptors

### Middleware (`utils/http/middleware.ts`)
API middleware functions:
- Error handling middleware
- Request validation middleware
- Rate limiting middleware
- CORS and authentication middleware

### Response Utilities (`utils/http/response.ts`)
Standardized response formatting:
- Success and error responses
- Paginated responses
- File download responses
- Streaming responses

## Key Features

### 1. Type Safety
- Comprehensive TypeScript interfaces
- Strict type checking for all data models
- API contract enforcement
- Runtime validation support

### 2. Error Resilience
- Circuit breaker pattern for external services
- Intelligent retry mechanisms with backoff
- Comprehensive error classification
- User-friendly error messages

### 3. Security
- AES-256-GCM encryption for sensitive data
- Secure credential storage
- Input validation and sanitization
- HMAC signatures for API security

### 4. Performance
- Response caching strategies
- Connection pooling and reuse
- Efficient data structures
- Monitoring and metrics

### 5. Maintainability
- Clean separation of concerns
- Dependency injection patterns
- Comprehensive logging
- Health check monitoring

## Usage Examples

### Creating a Service
```typescript
import { AbstractBaseService } from './services/base'
import { serviceRegistry } from './services/registry'

class MyService extends AbstractBaseService {
  constructor() {
    super('MyService')
  }

  async initialize(): Promise<void> {
    // Service initialization logic
  }
}

const service = new MyService()
serviceRegistry.register('my-service', service)
```

### Error Handling
```typescript
import { ErrorFactory, ErrorHandler } from './utils/errors'

try {
  // Some operation
} catch (error) {
  const appError = ErrorFactory.createValidationError(
    'Invalid input provided',
    'email',
    userInput.email
  )
  
  const handler = new ErrorHandler(config)
  const processedError = handler.handleError(appError)
  
  return ResponseUtils.error(processedError.message, processedError.code)
}
```

### Validation
```typescript
import { ValidationSchemas } from './utils/validation'

const validation = ValidationSchemas.validateCodeGenerationRequest(request)
if (!validation.isValid) {
  return ResponseUtils.badRequest('Validation failed', {
    errors: validation.errors
  })
}
```

This enhanced project structure provides a solid foundation for building the SFMC Development Suite with proper separation of concerns, type safety, error resilience, and maintainability.