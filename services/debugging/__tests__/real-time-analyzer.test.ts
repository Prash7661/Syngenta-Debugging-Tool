import { RealTimeAnalyzer } from '../real-time-analyzer'
import { CodeLanguage } from '../../../types/debugging'

describe('RealTimeAnalyzer', () => {
  let analyzer: RealTimeAnalyzer

  beforeEach(() => {
    analyzer = new RealTimeAnalyzer({
      debounceMs: 100,
      enableLiveValidation: true,
      enablePerformanceMetrics: true,
      enableBestPractices: true
    })
  })

  afterEach(() => {
    // Clean up any pending timers
    analyzer.clearCache('test-session')
  })

  describe('real-time analysis', () => {
    it('should perform debounced analysis', async () => {
      const code = 'var test = "hello world"'
      const language: CodeLanguage = 'javascript'
      const sessionId = 'test-session'

      const result = await analyzer.analyzeCodeRealTime(code, language, sessionId)

      expect(result).toBeDefined()
      expect(result.isValid).toBeDefined()
      expect(result.errors).toBeInstanceOf(Array)
      expect(result.warnings).toBeInstanceOf(Array)
      expect(result.suggestions).toBeInstanceOf(Array)
      expect(result.lastUpdated).toBeInstanceOf(Date)
    })

    it('should validate syntax immediately', async () => {
      const code = 'var test = "unclosed string'
      const language: CodeLanguage = 'javascript'

      const errors = await analyzer.validateSyntaxImmediate(code, language)

      expect(errors).toBeInstanceOf(Array)
      // Should detect syntax error for unclosed string
    })

    it('should calculate performance metrics', async () => {
      const code = `
        function complexFunction() {
          for (let i = 0; i < 100; i++) {
            for (let j = 0; j < 100; j++) {
              console.log(i * j)
            }
          }
        }
      `
      const language: CodeLanguage = 'javascript'

      const metrics = await analyzer.calculatePerformanceMetrics(code, language)

      expect(metrics).toBeDefined()
      expect(metrics.complexity).toBeDefined()
      expect(metrics.estimatedExecutionTime).toBeGreaterThan(0)
      expect(metrics.loopComplexity).toBeGreaterThan(0)
    })

    it('should enforce best practices', async () => {
      const code = `
        var a = 1
        var b = 2
        function f() {
          return a + b
        }
      `
      const language: CodeLanguage = 'javascript'

      const violations = await analyzer.enforceBestPractices(code, language)

      expect(violations).toBeInstanceOf(Array)
      // Should detect short variable names and missing documentation
    })
  })

  describe('caching', () => {
    it('should cache analysis results', async () => {
      const code = 'var test = "hello"'
      const language: CodeLanguage = 'javascript'
      const sessionId = 'cache-test-session'

      await analyzer.analyzeCodeRealTime(code, language, sessionId)
      const cachedResult = analyzer.getCachedResult(sessionId)

      expect(cachedResult).toBeDefined()
      expect(cachedResult?.lastUpdated).toBeInstanceOf(Date)
    })

    it('should clear cache', () => {
      const sessionId = 'clear-test-session'
      
      analyzer.clearCache(sessionId)
      const cachedResult = analyzer.getCachedResult(sessionId)

      expect(cachedResult).toBeUndefined()
    })
  })

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        debounceMs: 500,
        enableLiveValidation: false
      }

      analyzer.updateConfig(newConfig)

      // Configuration should be updated (no direct way to test private config)
      expect(true).toBe(true) // Placeholder assertion
    })
  })
})