"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Copy, Download, Bug, User, Bot, Loader2, Send, AlertCircle, CheckCircle, Clock, Zap, Settings, BarChart3, GitCompare, Eye, EyeOff } from "lucide-react"
import { useRealTimeAnalysis } from "@/hooks/use-realtime-analysis"
import type { CodeLanguage } from "@/types/debugging"
import ReactDiffViewer from 'react-diff-viewer-continued'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from "next-themes"

interface DebugMessage {
  id: string
  role: "user" | "assistant"
  content: string
  code?: string
  language?: string
  timestamp: number
  optimizedCode?: string
  performanceImprovement?: number
}

interface CodeComparison {
  original: string
  optimized: string
  language: string
  improvements: {
    performanceGain: number
    errorsFix: number
    warningsFixed: number
    bestPracticesApplied: number
  }
}

interface LineError {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning' | 'info'
  type: string
}

const placeholderExamples = {
  ampscript: `%%[
VAR @firstName, @lastName, @email
SET @firstName = AttributeValue("FirstName")
SET @lastName = AttributeValue("LastName")
SET @email = AttributeValue("EmailAddress")

/* Intentional Error: Using a single "=" instead of "==" for comparison */
IF @firstName = "Prashant" THEN
    SET @greeting = Concat("Hello ", @firstName, " ", @lastName, "!")
ELSE
    SET @greeting = "Hello Subscriber!"
ENDIF
]%%

%%=v(@greeting)=%%`,

  ssjs: `<script runat="server">
Platform.Load("Core", "1");
var firstName = Attribute.GetValue("firstName");
var lastName = Attribute.GetValue("lastName");
var email = Attribute.GetValue("emailAddress");

// Intentional Error: Using assignment instead of comparison
if(firstName = "Prashant") {
  var greeting = "Hello, " + firstName + "!";
} else {
  var greeting = "Hello Subscriber!";
}
</script>`,

  html: `<!DOCTYPE html>
<html>
<head>
  <title>Email Template</title>
</head>
<body>
  <h1>%%=v(@greeting)=%%</h1>
  <!-- Intentional Error: Unclosed div tag -->
  <div class="content">
    <p>Welcome %%=v(@firstName)=%% %%=v(@lastName)=%%</p>
  <!-- Missing closing div tag -->
</body>
</html>`,

  css: `.email-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  /* Intentional Error: Invalid property value */
  background-color: #invalid-color;
  padding: 20px;
}

.header {
  font-size: 24px;
  color: #333;
  /* Missing semicolon */
  text-align: center
}`,

  javascript: `function validateEmail(email) {
  // Intentional Error: Incorrect regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (email = emailRegex.test(email)) { // Assignment instead of comparison
    return true;
  } else {
    return false;
  }
}

// Missing return statement
function processUserData(userData) {
  if (userData && userData.email) {
    validateEmail(userData.email);
  }
}`,

  sql: `SELECT 
  u.first_name,
  u.last_name,
  u.email,
  p.product_name
FROM users u
INNER JOIN purchases p ON u.user_id = p.user_id
WHERE u.created_date > '2024-01-01'
  AND u.status = 'active'
  -- Intentional Error: Missing GROUP BY for aggregate function
  AND COUNT(p.purchase_id) > 5
ORDER BY u.last_name;`,
}

export function DebuggingTool() {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState<CodeLanguage>("ampscript")
  const [messages, setMessages] = useState<DebugMessage[]>([])
  const [isDebugging, setIsDebugging] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState("")
  
  // Real-time analysis settings
  const [enableRealTimeAnalysis, setEnableRealTimeAnalysis] = useState(true)
  const [enablePerformanceMetrics, setEnablePerformanceMetrics] = useState(true)
  const [enableBestPractices, setEnableBestPractices] = useState(true)
  const [showRealTimePanel, setShowRealTimePanel] = useState(true)
  
  // Enhanced features state
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [highlightErrors, setHighlightErrors] = useState(true)
  const [showPerformanceCharts, setShowPerformanceCharts] = useState(true)
  const [codeComparison, setCodeComparison] = useState<CodeComparison | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [lineErrors, setLineErrors] = useState<LineError[]>([])
  const [optimizedCode, setOptimizedCode] = useState("")
  
  // Refs
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null)
  const { theme } = useTheme()

  // Generate session ID
  const sessionId = useMemo(() => `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, [])

  // Real-time analysis hook
  const {
    isAnalyzing,
    result,
    performanceMetrics,
    bestPracticeViolations,
    error: analysisError,
    analyzeCode: analyzeCodeRealTime,
    validateSyntaxImmediate,
    hasErrors,
    hasWarnings,
    isValid,
    errorCount,
    warningCount,
    suggestionCount
  } = useRealTimeAnalysis({
    sessionId,
    debounceMs: 300,
    enableLiveValidation: enableRealTimeAnalysis,
    enablePerformanceMetrics,
    enableBestPractices
  })

  // Trigger real-time analysis when code changes
  useEffect(() => {
    if (enableRealTimeAnalysis && code.trim()) {
      analyzeCodeRealTime(code, language)
    }
  }, [code, language, enableRealTimeAnalysis, analyzeCodeRealTime])

  // Update line errors when analysis result changes
  useEffect(() => {
    if (result) {
      const errors: LineError[] = [
        ...result.errors.map(error => ({
          line: error.line,
          column: error.column || 0,
          message: error.message,
          severity: 'error' as const,
          type: error.rule || 'syntax'
        })),
        ...result.warnings.map(warning => ({
          line: warning.line,
          column: warning.column || 0,
          message: warning.message,
          severity: 'warning' as const,
          type: warning.rule || 'style'
        }))
      ]
      setLineErrors(errors)
    } else {
      setLineErrors([])
    }
  }, [result])

  // Enhanced code highlighting with error overlay
  const renderCodeWithHighlighting = useCallback((codeText: string, errors: LineError[]) => {
    if (!highlightErrors || errors.length === 0) {
      return (
        <SyntaxHighlighter
          language={mapLanguageForPrism(language)}
          style={theme === 'dark' ? oneDark : oneLight}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            fontSize: '14px',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {codeText}
        </SyntaxHighlighter>
      )
    }

    const lines = codeText.split('\n')
    const errorsByLine = errors.reduce((acc, error) => {
      if (!acc[error.line]) acc[error.line] = []
      acc[error.line].push(error)
      return acc
    }, {} as Record<number, LineError[]>)

    return (
      <div className="relative">
        <SyntaxHighlighter
          language={mapLanguageForPrism(language)}
          style={theme === 'dark' ? oneDark : oneLight}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            fontSize: '14px',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
          }}
          wrapLines={true}
          wrapLongLines={true}
          lineProps={(lineNumber) => {
            const lineErrors = errorsByLine[lineNumber]
            if (lineErrors && lineErrors.length > 0) {
              const hasError = lineErrors.some(e => e.severity === 'error')
              const hasWarning = lineErrors.some(e => e.severity === 'warning')
              
              return {
                style: {
                  backgroundColor: hasError 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : hasWarning 
                    ? 'rgba(245, 158, 11, 0.1)' 
                    : undefined,
                  borderLeft: hasError 
                    ? '3px solid rgb(239, 68, 68)' 
                    : hasWarning 
                    ? '3px solid rgb(245, 158, 11)' 
                    : undefined,
                  paddingLeft: hasError || hasWarning ? '8px' : undefined
                }
              }
            }
            return {}
          }}
        >
          {codeText}
        </SyntaxHighlighter>
        
        {/* Error tooltips overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {Object.entries(errorsByLine).map(([lineNum, lineErrors]) => (
            <div
              key={lineNum}
              className="absolute right-2 pointer-events-auto"
              style={{ top: `${(parseInt(lineNum) - 1) * 1.5}em` }}
            >
              <div className="group relative">
                <div className={`w-2 h-2 rounded-full ${
                  lineErrors.some(e => e.severity === 'error') 
                    ? 'bg-red-500' 
                    : 'bg-yellow-500'
                }`} />
                <div className="absolute right-0 top-6 w-64 p-2 bg-popover border rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {lineErrors.map((error, idx) => (
                    <div key={idx} className="text-xs mb-1 last:mb-0">
                      <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'} className="text-xs mr-1">
                        {error.severity}
                      </Badge>
                      {error.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }, [language, theme, showLineNumbers, highlightErrors])

  const mapLanguageForPrism = (lang: string): string => {
    const mapping: Record<string, string> = {
      'ampscript': 'markup',
      'ssjs': 'javascript',
      'javascript': 'javascript',
      'sql': 'sql',
      'css': 'css',
      'html': 'markup'
    }
    return mapping[lang.toLowerCase()] || 'text'
  }

  // Performance metrics visualization
  const renderPerformanceChart = useCallback(() => {
    if (!performanceMetrics || !showPerformanceCharts) return null

    const metrics = [
      { label: 'Execution Time', value: performanceMetrics.estimatedExecutionTime, max: 1000, unit: 'ms', color: 'bg-blue-500' },
      { label: 'Memory Usage', value: performanceMetrics.memoryUsage.estimatedMemoryUsage / 1024, max: 1024, unit: 'KB', color: 'bg-green-500' },
      { label: 'Complexity', value: performanceMetrics.complexity.cyclomaticComplexity, max: 20, unit: '', color: 'bg-yellow-500' },
      { label: 'API Calls', value: performanceMetrics.apiCallCount, max: 10, unit: '', color: 'bg-purple-500' }
    ]

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium">Performance Metrics</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{metric.label}</span>
                <span className="font-medium">
                  {metric.value.toFixed(1)}{metric.unit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${metric.color}`}
                  style={{ width: `${Math.min((metric.value / metric.max) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.value > metric.max * 0.8 ? 'High' : metric.value > metric.max * 0.5 ? 'Medium' : 'Low'}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }, [performanceMetrics, showPerformanceCharts])

  // Code comparison functionality
  const generateOptimizedCode = useCallback(async (originalCode: string, analysisResult: any) => {
    try {
      const response = await fetch('/api/debug-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: originalCode,
          language,
          analysisLevel: 'optimization',
          generateOptimized: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.optimizedCode) {
          setOptimizedCode(data.optimizedCode)
          setCodeComparison({
            original: originalCode,
            optimized: data.optimizedCode,
            language,
            improvements: {
              performanceGain: data.performanceImprovement || 0,
              errorsFix: analysisResult?.errors?.length || 0,
              warningsFixed: analysisResult?.warnings?.length || 0,
              bestPracticesApplied: data.bestPracticesApplied || 0
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to generate optimized code:', error)
    }
  }, [language])

  const currentPlaceholder =
    placeholderExamples[language as keyof typeof placeholderExamples] || placeholderExamples.ampscript

  const handleDebug = async () => {
    if (!code.trim()) return

    const userMessage: DebugMessage = {
      id: Date.now().toString(),
      role: "user",
      content: `Please debug this ${language.toUpperCase()} code:`,
      code: code,
      language: language,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    const originalCode = code
    setCode("")
    setIsDebugging(true)

    try {
      const response = await fetch("/api/debug-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: userMessage.code,
          language: userMessage.language,
          conversationHistory: messages,
          generateOptimized: true,
          analysisLevel: 'comprehensive'
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to debug code")
      }

      const data = await response.json()

      const assistantMessage: DebugMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.analysis,
        timestamp: Date.now(),
        optimizedCode: data.optimizedCode,
        performanceImprovement: data.performanceImprovement
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Generate code comparison if optimized code is available
      if (data.optimizedCode) {
        setCodeComparison({
          original: originalCode,
          optimized: data.optimizedCode,
          language,
          improvements: {
            performanceGain: data.performanceImprovement || 0,
            errorsFix: data.errorsFixed || 0,
            warningsFixed: data.warningsFixed || 0,
            bestPracticesApplied: data.bestPracticesApplied || 0
          }
        })
        setShowComparison(true)
      }

    } catch (error) {
      const errorMessage: DebugMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I encountered an error while debugging your code. Please try again or ask a follow-up question.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsDebugging(false)
    }
  }

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim()) return

    const userMessage: DebugMessage = {
      id: Date.now().toString(),
      role: "user",
      content: followUpQuestion,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setFollowUpQuestion("")
    setIsDebugging(true)

    try {
      const response = await fetch("/api/debug-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          conversationHistory: messages,
          isFollowUp: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to process follow-up")
      }

      const data = await response.json()

      const assistantMessage: DebugMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.analysis,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: DebugMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I encountered an error processing your question. Please try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsDebugging(false)
    }
  }

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const downloadContent = (content: string, filename = "debug-analysis.txt") => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const extractAnalysisAndCode = (markdown: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const codeBlocks: { language: string; code: string }[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    const analysisParts: string[] = []

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      const before = markdown.slice(lastIndex, match.index)
      if (before.trim()) analysisParts.push(before.trim())
      codeBlocks.push({
        language: (match[1] || "text").toLowerCase(),
        code: (match[2] || "").trim(),
      })
      lastIndex = codeBlockRegex.lastIndex
    }
    const tail = markdown.slice(lastIndex)
    if (tail.trim()) analysisParts.push(tail.trim())

    return {
      analysis: analysisParts.join("\n\n").trim(),
      codeBlocks,
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
            Code Input
          </CardTitle>
          <CardDescription>Debug AMPScript, SSJS, HTML, CSS, JavaScript, and SQL</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
          <div className="flex-shrink-0">
            <label className="text-sm font-medium mb-2 block">Code Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ampscript">AMPScript</SelectItem>
                <SelectItem value="ssjs">SSJS</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="css">CSS</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Code Input</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="line-numbers"
                    checked={showLineNumbers}
                    onCheckedChange={setShowLineNumbers}
                  />
                  <Label htmlFor="line-numbers" className="text-xs">Line Numbers</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="highlight-errors"
                    checked={highlightErrors}
                    onCheckedChange={setHighlightErrors}
                  />
                  <Label htmlFor="highlight-errors" className="text-xs">Highlight Errors</Label>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative border rounded-md overflow-hidden">
              {code.trim() && highlightErrors && lineErrors.length > 0 ? (
                <div className="h-full overflow-auto">
                  {renderCodeWithHighlighting(code, lineErrors)}
                </div>
              ) : (
                <Textarea
                  ref={codeTextareaRef}
                  placeholder={currentPlaceholder}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-full font-mono text-sm resize-none border-0 focus-visible:ring-0"
                />
              )}
              
              {/* Live error indicators */}
              {highlightErrors && lineErrors.length > 0 && (
                <div className="absolute top-2 right-2 flex gap-1">
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {errorCount} errors
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {warningCount} warnings
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button onClick={handleDebug} disabled={!code.trim() || isDebugging} className="flex-shrink-0">
            <Bug className="mr-2 h-4 w-4" />
            {isDebugging ? "Debugging..." : "Debug Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Real-time Analysis Panel */}
      {showRealTimePanel && (
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <CardTitle>Real-time Analysis</CardTitle>
                {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRealTimePanel(false)}
              >
                Hide
              </Button>
            </div>
            <CardDescription>Live error detection and performance metrics</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Analysis Settings */}
            <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Switch
                  id="real-time-analysis"
                  checked={enableRealTimeAnalysis}
                  onCheckedChange={setEnableRealTimeAnalysis}
                />
                <Label htmlFor="real-time-analysis" className="text-sm">Live Validation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="performance-metrics"
                  checked={enablePerformanceMetrics}
                  onCheckedChange={setEnablePerformanceMetrics}
                />
                <Label htmlFor="performance-metrics" className="text-sm">Performance Metrics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="best-practices"
                  checked={enableBestPractices}
                  onCheckedChange={setEnableBestPractices}
                />
                <Label htmlFor="best-practices" className="text-sm">Best Practices</Label>
              </div>
            </div>

            {/* Analysis Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                {isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-xs text-muted-foreground">
                    {isValid ? "Valid" : "Has Issues"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-sm font-medium">{errorCount}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="text-sm font-medium">{warningCount}</div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                <Zap className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">{suggestionCount}</div>
                  <div className="text-xs text-muted-foreground">Suggestions</div>
                </div>
              </div>
            </div>

            {/* Performance Metrics with Charts */}
            {enablePerformanceMetrics && performanceMetrics && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Performance Metrics</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="performance-charts"
                      checked={showPerformanceCharts}
                      onCheckedChange={setShowPerformanceCharts}
                    />
                    <Label htmlFor="performance-charts" className="text-xs">Charts</Label>
                  </div>
                </div>
                
                {showPerformanceCharts ? (
                  renderPerformanceChart()
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="text-sm font-medium">{performanceMetrics.estimatedExecutionTime.toFixed(1)}ms</div>
                      <div className="text-xs text-muted-foreground">Est. Execution Time</div>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="text-sm font-medium">{performanceMetrics.complexity.cyclomaticComplexity}</div>
                      <div className="text-xs text-muted-foreground">Complexity</div>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="text-sm font-medium">{performanceMetrics.apiCallCount}</div>
                      <div className="text-xs text-muted-foreground">API Calls</div>
                    </div>
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="text-sm font-medium">{(performanceMetrics.memoryUsage.estimatedMemoryUsage / 1024).toFixed(1)}KB</div>
                      <div className="text-xs text-muted-foreground">Memory Usage</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Errors and Warnings */}
            {result && (result.errors.length > 0 || result.warnings.length > 0) && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  {result.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                          <span className="text-xs text-muted-foreground">Line {error.line}</span>
                        </div>
                        <div className="text-sm font-medium">{error.message}</div>
                        {error.fixSuggestion && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Suggestion: {error.fixSuggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">Warning</Badge>
                          <span className="text-xs text-muted-foreground">Line {warning.line}</span>
                        </div>
                        <div className="text-sm font-medium">{warning.message}</div>
                        {warning.fixSuggestion && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Suggestion: {warning.fixSuggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best Practice Violations */}
            {enableBestPractices && bestPracticeViolations.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Best Practice Violations</span>
                </div>
                <div className="space-y-2">
                  {bestPracticeViolations.slice(0, 5).map((violation, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{violation.category}</Badge>
                          <span className="text-xs text-muted-foreground">Line {violation.line}</span>
                        </div>
                        <div className="text-sm font-medium">{violation.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {violation.suggestion}
                        </div>
                      </div>
                    </div>
                  ))}
                  {bestPracticeViolations.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      And {bestPracticeViolations.length - 5} more violations...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analysis Error */}
            {analysisError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Analysis Error</span>
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {analysisError}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show Real-time Panel Button (when hidden) */}
      {!showRealTimePanel && (
        <Button
          variant="outline"
          onClick={() => setShowRealTimePanel(true)}
          className="w-full"
        >
          <Zap className="mr-2 h-4 w-4" />
          Show Real-time Analysis
        </Button>
      )}

      {/* Code Comparison Panel */}
      {codeComparison && (
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <CardTitle>Code Comparison</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                >
                  {showComparison ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showComparison ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCodeComparison(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            <CardDescription>
              Before and after optimization with performance improvements
            </CardDescription>
          </CardHeader>

          {showComparison && (
            <CardContent className="space-y-4">
              {/* Improvement Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    +{codeComparison.improvements.performanceGain.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Performance</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    -{codeComparison.improvements.errorsFix}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors Fixed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">
                    -{codeComparison.improvements.warningsFixed}
                  </div>
                  <div className="text-xs text-muted-foreground">Warnings Fixed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    +{codeComparison.improvements.bestPracticesApplied}
                  </div>
                  <div className="text-xs text-muted-foreground">Best Practices</div>
                </div>
              </div>

              {/* Code Diff Viewer */}
              <div className="border rounded-lg overflow-hidden">
                <Tabs defaultValue="diff" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="diff">
                      <GitCompare className="h-4 w-4 mr-1" />
                      Diff View
                    </TabsTrigger>
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="optimized">Optimized</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="diff" className="mt-0">
                    <ReactDiffViewer
                      oldValue={codeComparison.original}
                      newValue={codeComparison.optimized}
                      splitView={true}
                      useDarkTheme={theme === 'dark'}
                      leftTitle="Original Code"
                      rightTitle="Optimized Code"
                      showDiffOnly={false}
                      styles={{
                        variables: {
                          dark: {
                            diffViewerBackground: theme === 'dark' ? '#0f0f0f' : '#ffffff',
                            addedBackground: '#1a4d1a',
                            removedBackground: '#4d1a1a',
                          }
                        }
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="original" className="mt-0">
                    <div className="p-4">
                      <SyntaxHighlighter
                        language={mapLanguageForPrism(codeComparison.language)}
                        style={theme === 'dark' ? oneDark : oneLight}
                        showLineNumbers={true}
                        customStyle={{ margin: 0, fontSize: '14px' }}
                      >
                        {codeComparison.original}
                      </SyntaxHighlighter>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="optimized" className="mt-0">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Optimized Code</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyContent(codeComparison.optimized)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadContent(codeComparison.optimized, `optimized-${codeComparison.language}.txt`)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                      <SyntaxHighlighter
                        language={mapLanguageForPrism(codeComparison.language)}
                        style={theme === 'dark' ? oneDark : oneLight}
                        showLineNumbers={true}
                        customStyle={{ margin: 0, fontSize: '14px' }}
                      >
                        {codeComparison.optimized}
                      </SyntaxHighlighter>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
            Debug Analysis
          </CardTitle>
          <CardDescription>Conversational debugging with context awareness</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col space-y-4">
          <div>
            <div className="space-y-4 p-2">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Debug Assistant Ready</p>
                  <p>Submit your code to get detailed analysis, error identification, and optimization suggestions.</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.role === "user"
                  const parsed = !isUser ? extractAnalysisAndCode(message.content) : null
                  return (
                    <div key={message.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-orange-500 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* message bubble and optional code blocks */}
                      <div className={`max-w-[900px] w-full ${isUser ? "order-first" : ""}`}>
                        {/* bubble for user text OR assistant analysis text */}
                        <div
                          className={`rounded-lg p-4 ${
                            isUser ? "bg-orange-500 text-white ml-auto max-w-[85%]" : "bg-muted"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {isUser ? message.content : parsed?.analysis || message.content}
                          </div>
                          {isUser && message.code && (
                            <div className="mt-3 p-3 bg-black/20 rounded text-sm font-mono overflow-x-auto">
                              <code>{message.code}</code>
                            </div>
                          )}
                        </div>

                        {/* assistant code panels below the analysis bubble */}
                        {!isUser && parsed && parsed.codeBlocks.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {parsed.codeBlocks.map((b, idx) => (
                              <div key={idx} className="rounded-lg border bg-background">
                                <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
                                  <span className="uppercase tracking-wide">{b.language}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => copyContent(b.code)}
                                    >
                                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() => downloadContent(b.code, `fixed-${b.language || "code"}.txt`)}
                                    >
                                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                                    </Button>
                                  </div>
                                </div>
                                <div className="p-3 bg-muted/60">
                                  <pre className="overflow-x-auto text-sm font-mono leading-6">
                                    <code>{b.code}</code>
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-blue-500 text-white">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )
                })
              )}

              {isDebugging && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-orange-500 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing code...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {messages.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask a follow-up question about the debugging results..."
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  className="flex-1 min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleFollowUp()
                    }
                  }}
                />
                <Button
                  onClick={handleFollowUp}
                  disabled={!followUpQuestion.trim() || isDebugging}
                  size="icon"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
