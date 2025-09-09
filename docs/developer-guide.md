# SFMC Development Suite - Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [API Reference](#api-reference)
5. [Service Layer](#service-layer)
6. [Frontend Components](#frontend-components)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Contributing](#contributing)
10. [Advanced Topics](#advanced-topics)

## Architecture Overview

### System Architecture
The SFMC Development Suite follows a modern, scalable architecture pattern:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Services      │
│   (Next.js)     │◄──►│   (REST/API)    │◄──►│   (Business)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │    │   Middleware    │    │   Data Layer    │
│   (React/TSX)   │    │   (Auth/Cache)  │    │   (Redis/SFMC)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Node.js, Next.js API Routes
- **Database**: Redis (caching and sessions)
- **External APIs**: OpenAI GPT, SFMC REST/SOAP APIs
- **Authentication**: OAuth 2.0, JWT
- **Testing**: Jest, React Testing Library
- **Deployment**: Docker, Kubernetes

### Design Patterns
- **Service Layer Pattern**: Business logic separation
- **Repository Pattern**: Data access abstraction
- **Factory Pattern**: Service instantiation
- **Observer Pattern**: Real-time updates
- **Circuit Breaker**: API resilience

## Development Setup

### Prerequisites
```bash
# Required versions
node --version  # v18.0.0+
npm --version   # v8.0.0+
git --version   # v2.0.0+
```

### Local Development Environment

#### 1. Clone and Setup
```bash
git clone https://github.com/your-org/sfmc-development-suite.git
cd sfmc-development-suite
npm install
```

#### 2. Environment Configuration
```bash
cp .env.example .env.development
```

Edit `.env.development`:
```env
# Application
NODE_ENV=development
PORT=3000
DEBUG=true

# SFMC Integration
SFMC_CLIENT_ID=your_client_id
SFMC_CLIENT_SECRET=your_client_secret
SFMC_SUBDOMAIN=your_subdomain
SFMC_AUTH_URL=https://your_subdomain.auth.marketingcloudapis.com
SFMC_REST_URL=https://your_subdomain.rest.marketingcloudapis.com
SFMC_SOAP_URL=https://your_subdomain.soap.marketingcloudapis.com

# AI Services
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
JWT_SECRET=your-32-character-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-session-secret

# Monitoring
LOG_LEVEL=debug
METRICS_ENABLED=true
```

#### 3. Start Development Services
```bash
# Start Redis
redis-server

# Start development server
npm run dev
```

### Development Tools

#### Code Quality
```bash
# ESLint
npm run lint
npm run lint:fix

# Prettier
npm run format
npm run format:check

# TypeScript
npm run type-check
```

#### Testing
```bash
# Unit tests
npm run test
npm run test:watch
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Project Structure

```
sfmc-development-suite/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── generate-code/        # Code generation API
│   │   ├── debug-code/           # Code debugging API
│   │   ├── generate-pages/       # Page generation API
│   │   ├── sfmc/                 # SFMC integration APIs
│   │   ├── session/              # Session management
│   │   ├── cache/                # Cache management
│   │   └── health/               # Health check endpoints
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── ai-code-generator.tsx     # AI code generation UI
│   ├── debugging-tool.tsx        # Code debugging interface
│   ├── cloud-pages-generator.tsx # Page generation UI
│   ├── error-boundary.tsx        # Error handling
│   └── system-health-dashboard.tsx
├── services/                     # Business logic layer
│   ├── ai/                       # AI service implementations
│   ├── sfmc/                     # SFMC integration services
│   ├── debugging/                # Code analysis services
│   ├── cloud-pages/              # Page generation services
│   ├── session/                  # Session management
│   ├── cache/                    # Caching services
│   ├── crypto/                   # Encryption services
│   ├── base/                     # Base service classes
│   ├── factory/                  # Service factory
│   └── registry/                 # Service registry
├── types/                        # TypeScript type definitions
│   ├── api.ts                    # API types
│   ├── sfmc.ts                   # SFMC types
│   ├── ai.ts                     # AI service types
│   ├── debugging.ts              # Debugging types
│   ├── cloud-pages.ts            # Cloud pages types
│   ├── session.ts                # Session types
│   ├── services.ts               # Service types
│   └── errors.ts                 # Error types
├── utils/                        # Utility functions
│   ├── http/                     # HTTP utilities
│   ├── crypto/                   # Cryptographic utilities
│   ├── validation/               # Validation utilities
│   ├── errors/                   # Error handling utilities
│   ├── logging/                  # Logging utilities
│   └── monitoring/               # Monitoring utilities
├── middleware/                   # Next.js middleware
│   ├── auth-middleware.ts        # Authentication middleware
│   ├── session-middleware.ts     # Session handling
│   ├── error-middleware.ts       # Error handling
│   └── monitoring-middleware.ts  # Performance monitoring
├── hooks/                        # Custom React hooks
│   └── use-realtime-analysis.ts  # Real-time analysis hook
├── __tests__/                    # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── performance/              # Performance tests
├── docs/                         # Documentation
├── scripts/                      # Build and deployment scripts
├── k8s/                          # Kubernetes configurations
├── .github/workflows/            # CI/CD workflows
├── docker-compose.dev.yml        # Development Docker setup
├── Dockerfile                    # Production Docker image
├── jest.config.js                # Jest configuration
├── next.config.js                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Project dependencies
```

## API Reference

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and create session.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "string",
    "username": "string",
    "preferences": {}
  }
}
```

### Code Generation Endpoints

#### POST /api/generate-code
Generate code using AI service.

**Request:**
```json
{
  "prompt": "Create a SQL query to find active subscribers",
  "language": "sql",
  "context": {
    "dataExtensions": ["Subscribers_DE"],
    "fields": ["SubscriberKey", "EmailAddress", "Status"]
  },
  "options": {
    "includeComments": true,
    "optimizePerformance": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "code": "SELECT SubscriberKey, EmailAddress FROM Subscribers_DE WHERE Status = 'Active'",
  "explanation": "This query selects active subscribers...",
  "metadata": {
    "language": "sql",
    "estimatedExecutionTime": "0.5s",
    "complexity": "low"
  }
}
```

### Debugging Endpoints

#### POST /api/debug-code
Analyze and debug code.

**Request:**
```json
{
  "code": "SELECT * FROM Subscribers WHERE Status = 'Active'",
  "language": "sql",
  "options": {
    "performanceAnalysis": true,
    "bestPracticesCheck": true,
    "securityScan": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "syntaxValid": true,
    "errors": [],
    "warnings": [
      {
        "line": 1,
        "message": "Avoid SELECT * for better performance",
        "severity": "warning",
        "suggestion": "SELECT specific columns instead"
      }
    ],
    "performance": {
      "estimatedExecutionTime": "2.3s",
      "complexity": "medium",
      "optimizationSuggestions": [
        "Add WHERE clause to limit results",
        "Consider adding index on Status column"
      ]
    },
    "bestPractices": {
      "score": 7,
      "violations": [
        "Use specific column names instead of *"
      ]
    }
  }
}
```

### SFMC Integration Endpoints

#### POST /api/sfmc/authenticate
Initiate SFMC OAuth flow.

**Request:**
```json
{
  "clientId": "string",
  "redirectUri": "string"
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://sfmc.auth.url/oauth/authorize?..."
}
```

#### GET /api/sfmc/data-extensions
Retrieve SFMC Data Extensions.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "dataExtensions": [
    {
      "name": "Subscribers_DE",
      "key": "subscribers",
      "fields": [
        {
          "name": "SubscriberKey",
          "type": "Text",
          "isPrimaryKey": true
        }
      ]
    }
  ]
}
```

## Service Layer

### Base Service Class

All services extend the base service class:

```typescript
// services/base/base-service.ts
export abstract class BaseService {
  protected logger: Logger;
  protected config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.logger = new Logger(this.constructor.name);
  }

  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<HealthStatus>;
}
```

### AI Code Generation Service

```typescript
// services/ai/ai-code-generation.service.ts
export class AICodeGenerationService extends BaseService {
  private openaiClient: OpenAI;
  private templateManager: TemplateManager;
  private conversationManager: ConversationManager;

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    try {
      // Validate request
      this.validateRequest(request);

      // Get conversation context
      const context = await this.conversationManager.getContext(request.sessionId);

      // Generate code using OpenAI
      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        messages: this.buildMessages(request, context),
        max_tokens: this.config.maxTokens,
        temperature: 0.1
      });

      // Process and validate generated code
      const code = this.extractCode(completion.choices[0].message.content);
      const validation = await this.validateGeneratedCode(code, request.language);

      // Save to conversation history
      await this.conversationManager.addInteraction(request.sessionId, {
        prompt: request.prompt,
        code,
        language: request.language,
        timestamp: new Date()
      });

      return {
        success: true,
        code,
        explanation: this.generateExplanation(code, request),
        metadata: {
          language: request.language,
          complexity: validation.complexity,
          estimatedExecutionTime: validation.estimatedTime
        }
      };
    } catch (error) {
      this.logger.error('Code generation failed', error);
      throw new CodeGenerationError('Failed to generate code', error);
    }
  }

  private validateRequest(request: CodeGenerationRequest): void {
    if (!request.prompt?.trim()) {
      throw new ValidationError('Prompt is required');
    }
    if (!this.supportedLanguages.includes(request.language)) {
      throw new ValidationError(`Unsupported language: ${request.language}`);
    }
  }

  private buildMessages(request: CodeGenerationRequest, context: ConversationContext): ChatMessage[] {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.getSystemPrompt(request.language)
      }
    ];

    // Add conversation history
    if (context.history.length > 0) {
      messages.push(...this.formatHistory(context.history));
    }

    // Add current request
    messages.push({
      role: 'user',
      content: this.formatUserPrompt(request)
    });

    return messages;
  }
}
```

### SFMC Integration Service

```typescript
// services/sfmc/sfmc-integration.service.ts
export class SFMCIntegrationService extends BaseService {
  private restClient: SFMCRestClient;
  private soapClient: SFMCSoapClient;
  private authService: SFMCAuthService;

  async authenticate(credentials: SFMCCredentials): Promise<AuthResult> {
    try {
      const tokens = await this.authService.authenticate(credentials);
      
      // Store encrypted tokens
      await this.storeTokens(credentials.clientId, tokens);
      
      return {
        success: true,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      };
    } catch (error) {
      this.logger.error('SFMC authentication failed', error);
      throw new AuthenticationError('Failed to authenticate with SFMC', error);
    }
  }

  async getDataExtensions(clientId: string): Promise<DataExtension[]> {
    try {
      const tokens = await this.getStoredTokens(clientId);
      
      if (!tokens || this.isTokenExpired(tokens)) {
        await this.refreshTokens(clientId);
        tokens = await this.getStoredTokens(clientId);
      }

      const response = await this.restClient.get('/data/v1/customobjectdata/key/DataExtension', {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      return response.items.map(item => this.mapDataExtension(item));
    } catch (error) {
      this.logger.error('Failed to retrieve data extensions', error);
      throw new SFMCAPIError('Failed to retrieve data extensions', error);
    }
  }

  async queryDataExtension(
    clientId: string, 
    query: string
  ): Promise<QueryResult> {
    try {
      const tokens = await this.getStoredTokens(clientId);
      
      const response = await this.restClient.post('/data/v1/customobjectdata/query', {
        query,
        format: 'json'
      }, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      return {
        success: true,
        data: response.results,
        rowCount: response.count,
        executionTime: response.executionTime
      };
    } catch (error) {
      this.logger.error('Data extension query failed', error);
      throw new QueryError('Failed to execute query', error);
    }
  }
}
```

### Debugging Service

```typescript
// services/debugging/code-analysis.service.ts
export class CodeAnalysisService extends BaseService {
  private validators: Map<string, CodeValidator>;
  private performanceAnalyzer: PerformanceAnalyzer;
  private bestPracticesEnforcer: BestPracticesEnforcer;

  constructor(config: ServiceConfig) {
    super(config);
    this.initializeValidators();
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    try {
      const validator = this.validators.get(request.language);
      if (!validator) {
        throw new ValidationError(`Unsupported language: ${request.language}`);
      }

      // Parallel analysis
      const [
        syntaxResult,
        performanceResult,
        bestPracticesResult
      ] = await Promise.all([
        validator.validateSyntax(request.code),
        this.performanceAnalyzer.analyze(request.code, request.language),
        this.bestPracticesEnforcer.check(request.code, request.language)
      ]);

      return {
        success: true,
        analysis: {
          syntaxValid: syntaxResult.isValid,
          errors: syntaxResult.errors,
          warnings: syntaxResult.warnings,
          performance: performanceResult,
          bestPractices: bestPracticesResult
        }
      };
    } catch (error) {
      this.logger.error('Code analysis failed', error);
      throw new AnalysisError('Failed to analyze code', error);
    }
  }

  private initializeValidators(): void {
    this.validators.set('sql', new SQLValidator());
    this.validators.set('ampscript', new AMPScriptValidator());
    this.validators.set('ssjs', new SSJSValidator());
    this.validators.set('html', new HTMLValidator());
    this.validators.set('css', new CSSValidator());
    this.validators.set('javascript', new JavaScriptValidator());
  }
}
```

## Frontend Components

### AI Code Generator Component

```typescript
// components/ai-code-generator.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { CodeEditor } from './code-editor';
import { LanguageSelector } from './language-selector';
import { GenerationOptions } from './generation-options';

interface AICodeGeneratorProps {
  onCodeGenerated?: (code: string) => void;
}

export const AICodeGenerator: React.FC<AICodeGeneratorProps> = ({
  onCodeGenerated
}) => {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('sql');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({
          prompt,
          language,
          options: {
            includeComments: true,
            optimizePerformance: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const result = await response.json();
      setGeneratedCode(result.code);
      onCodeGenerated?.(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, language, session, onCodeGenerated]);

  return (
    <div className="ai-code-generator">
      <div className="generator-controls">
        <LanguageSelector
          value={language}
          onChange={setLanguage}
          languages={['sql', 'ampscript', 'ssjs', 'html', 'css', 'javascript']}
        />
        
        <textarea
          className="prompt-input"
          placeholder="Describe what code you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />

        <button
          className="generate-button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? 'Generating...' : 'Generate Code'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {generatedCode && (
        <div className="generated-code">
          <div className="code-header">
            <h3>Generated Code</h3>
            <button
              onClick={() => navigator.clipboard.writeText(generatedCode)}
              className="copy-button"
            >
              Copy to Clipboard
            </button>
          </div>
          
          <CodeEditor
            value={generatedCode}
            language={language}
            readOnly
            showLineNumbers
            highlightSyntax
          />
        </div>
      )}
    </div>
  );
};
```

### Real-time Debugging Hook

```typescript
// hooks/use-realtime-analysis.ts
import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

interface AnalysisResult {
  syntaxValid: boolean;
  errors: Array<{
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  performance: {
    complexity: string;
    estimatedTime: string;
  };
}

export const useRealtimeAnalysis = (code: string, language: string) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeCode = useCallback(
    debounce(async (codeToAnalyze: string, lang: string) => {
      if (!codeToAnalyze.trim()) {
        setAnalysis(null);
        return;
      }

      setIsAnalyzing(true);

      try {
        const response = await fetch('/api/debug-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: codeToAnalyze,
            language: lang,
            options: {
              performanceAnalysis: true,
              bestPracticesCheck: true
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          setAnalysis(result.analysis);
        }
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 1000),
    []
  );

  useEffect(() => {
    analyzeCode(code, language);
  }, [code, language, analyzeCode]);

  return { analysis, isAnalyzing };
};
```

## Testing

### Unit Testing Example

```typescript
// services/ai/__tests__/ai-code-generation.service.test.ts
import { AICodeGenerationService } from '../ai-code-generation.service';
import { OpenAI } from 'openai';

jest.mock('openai');

describe('AICodeGenerationService', () => {
  let service: AICodeGenerationService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>;
    service = new AICodeGenerationService({
      openaiApiKey: 'test-key',
      model: 'gpt-4',
      maxTokens: 1000
    });
    (service as any).openaiClient = mockOpenAI;
  });

  describe('generateCode', () => {
    it('should generate SQL code successfully', async () => {
      // Arrange
      const request = {
        prompt: 'Create a query to find active subscribers',
        language: 'sql',
        sessionId: 'test-session'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'SELECT * FROM Subscribers WHERE Status = \'Active\''
          }
        }]
      } as any);

      // Act
      const result = await service.generateCode(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.code).toContain('SELECT');
      expect(result.code).toContain('Active');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          max_tokens: 1000
        })
      );
    });

    it('should throw error for invalid language', async () => {
      // Arrange
      const request = {
        prompt: 'Test prompt',
        language: 'invalid-language',
        sessionId: 'test-session'
      };

      // Act & Assert
      await expect(service.generateCode(request)).rejects.toThrow(
        'Unsupported language: invalid-language'
      );
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/api-endpoints.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../../app/api/generate-code/route';

describe('/api/generate-code', () => {
  it('should generate code successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        prompt: 'Create a SQL query to find active subscribers',
        language: 'sql'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.code).toBeDefined();
    expect(typeof data.code).toBe('string');
  });

  it('should return 400 for missing prompt', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        language: 'sql'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toContain('Prompt is required');
  });
});
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Kubernetes Deployment

```yaml
# k8s/app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sfmc-dev-suite
  labels:
    app: sfmc-dev-suite
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sfmc-dev-suite
  template:
    metadata:
      labels:
        app: sfmc-dev-suite
    spec:
      containers:
      - name: sfmc-dev-suite
        image: your-registry/sfmc-dev-suite:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        - name: SFMC_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: sfmc-client-id
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes and test**:
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```
4. **Commit with conventional commits**:
   ```bash
   git commit -m "feat: add new code generation feature"
   ```
5. **Push and create PR**

### Code Standards

#### TypeScript Guidelines
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper error handling with custom error classes
- Implement proper logging throughout the application

#### Testing Requirements
- Minimum 80% code coverage
- Unit tests for all service methods
- Integration tests for API endpoints
- E2E tests for critical user flows

#### Documentation Standards
- JSDoc comments for all public methods
- README files for each major component
- API documentation using OpenAPI/Swagger
- Architecture decision records (ADRs)

## Advanced Topics

### Performance Optimization

#### Caching Strategy
```typescript
// Implement multi-level caching
class CacheManager {
  private memoryCache: Map<string, any> = new Map();
  private redisClient: Redis;

  async get(key: string): Promise<any> {
    // L1: Memory cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // L2: Redis cache
    const redisValue = await this.redisClient.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      this.memoryCache.set(key, parsed);
      return parsed;
    }

    return null;
  }
}
```

#### Database Optimization
- Use connection pooling for Redis
- Implement query result caching
- Use Redis clustering for high availability
- Monitor and optimize slow queries

### Security Best Practices

#### Authentication & Authorization
```typescript
// Implement JWT with refresh tokens
class AuthService {
  generateTokens(user: User): TokenPair {
    const accessToken = jwt.sign(
      { userId: user.id, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }
}
```

#### Data Encryption
```typescript
// Encrypt sensitive data at rest
class EncryptionService {
  encrypt(data: string): string {
    const cipher = crypto.createCipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encryptedData: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

### Monitoring and Observability

#### Application Metrics
```typescript
// Implement custom metrics collection
class MetricsCollector {
  private metrics: Map<string, number> = new Map();

  increment(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  gauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  async exportMetrics(): Promise<string> {
    // Export in Prometheus format
    let output = '';
    for (const [key, value] of this.metrics) {
      output += `${key} ${value}\n`;
    }
    return output;
  }
}
```

#### Error Tracking
```typescript
// Implement structured error logging
class ErrorTracker {
  logError(error: Error, context: any): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      userId: context.userId,
      requestId: context.requestId
    };

    // Send to logging service
    this.logger.error('Application error', errorData);
    
    // Send to error tracking service (e.g., Sentry)
    this.sentryClient.captureException(error, { extra: context });
  }
}
```

This developer guide provides comprehensive information for developers working on the SFMC Development Suite. It covers architecture, setup, implementation details, testing, deployment, and advanced topics to ensure successful development and maintenance of the application.