"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ImageIcon, Copy, Download, Send, User, Bot, Loader2, Code, FileText, Settings, Palette } from "lucide-react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { saveAs } from 'file-saver'
import { useTheme } from "next-themes"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  image?: string
  timestamp: number
  metadata?: {
    language?: CodeLanguage
    codeBlocks?: CodeBlock[]
  }
}

interface CodeBlock {
  language: string
  code: string
  explanation?: string
  startLine?: number
  endLine?: number
}

type CodeLanguage = "sql" | "ampscript" | "ssjs" | "javascript" | "css" | "html" | "json" | "xml" | "typescript" | "python" | "java" | "csharp"

type ExportFormat = "txt" | "md" | "html" | "json"

interface ExportOptions {
  format: ExportFormat
  includeTimestamps: boolean
  includeMetadata: boolean
  codeOnly: boolean
}

export function AICodeGenerator() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>("javascript")
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "txt",
    includeTimestamps: false,
    includeMetadata: false,
    codeOnly: false
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  const supportedLanguages: { value: CodeLanguage; label: string; color: string }[] = [
    { value: "sql", label: "SQL", color: "bg-blue-500" },
    { value: "ampscript", label: "AMPScript", color: "bg-orange-500" },
    { value: "ssjs", label: "SSJS", color: "bg-yellow-500" },
    { value: "javascript", label: "JavaScript", color: "bg-yellow-600" },
    { value: "typescript", label: "TypeScript", color: "bg-blue-600" },
    { value: "css", label: "CSS", color: "bg-blue-400" },
    { value: "html", label: "HTML", color: "bg-red-500" },
    { value: "json", label: "JSON", color: "bg-green-500" },
    { value: "xml", label: "XML", color: "bg-purple-500" },
    { value: "python", label: "Python", color: "bg-green-600" },
    { value: "java", label: "Java", color: "bg-red-600" },
    { value: "csharp", label: "C#", color: "bg-purple-600" }
  ]

  // Enhanced code block parsing
  const parseCodeBlocks = useCallback((content: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const blocks: CodeBlock[] = []
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || selectedLanguage
      const code = match[2].trim()
      
      blocks.push({
        language: language as CodeLanguage,
        code,
        explanation: extractExplanation(content, match.index)
      })
    }

    return blocks
  }, [selectedLanguage])

  const extractExplanation = (content: string, codeIndex: number): string => {
    const beforeCode = content.substring(0, codeIndex)
    const lines = beforeCode.split('\n')
    const lastFewLines = lines.slice(-3).join('\n').trim()
    return lastFewLines.length > 10 ? lastFewLines : ""
  }

  // Enhanced export functionality
  const exportConversation = useCallback((format: ExportFormat, options: ExportOptions) => {
    let content = ""
    const timestamp = new Date().toISOString().split('T')[0]
    
    switch (format) {
      case "txt":
        content = exportAsText(options)
        saveAs(new Blob([content], { type: "text/plain" }), `ai-conversation-${timestamp}.txt`)
        break
      case "md":
        content = exportAsMarkdown(options)
        saveAs(new Blob([content], { type: "text/markdown" }), `ai-conversation-${timestamp}.md`)
        break
      case "html":
        content = exportAsHTML(options)
        saveAs(new Blob([content], { type: "text/html" }), `ai-conversation-${timestamp}.html`)
        break
      case "json":
        content = exportAsJSON(options)
        saveAs(new Blob([content], { type: "application/json" }), `ai-conversation-${timestamp}.json`)
        break
    }
  }, [messages])

  const exportAsText = (options: ExportOptions): string => {
    if (options.codeOnly) {
      return messages
        .filter(m => m.metadata?.codeBlocks?.length)
        .map(m => m.metadata!.codeBlocks!.map(block => block.code).join('\n\n'))
        .join('\n\n---\n\n')
    }

    return messages.map(msg => {
      let content = `${msg.role.toUpperCase()}: ${msg.content}`
      if (options.includeTimestamps) {
        content = `[${new Date(msg.timestamp).toLocaleString()}] ${content}`
      }
      if (options.includeMetadata && msg.metadata) {
        content += `\nMetadata: ${JSON.stringify(msg.metadata, null, 2)}`
      }
      return content
    }).join('\n\n')
  }

  const exportAsMarkdown = (options: ExportOptions): string => {
    if (options.codeOnly) {
      return messages
        .filter(m => m.metadata?.codeBlocks?.length)
        .map(m => m.metadata!.codeBlocks!.map(block => 
          `\`\`\`${block.language}\n${block.code}\n\`\`\``
        ).join('\n\n'))
        .join('\n\n---\n\n')
    }

    return messages.map(msg => {
      let content = `## ${msg.role === 'user' ? 'User' : 'Assistant'}\n\n${msg.content}`
      if (options.includeTimestamps) {
        content = `*${new Date(msg.timestamp).toLocaleString()}*\n\n${content}`
      }
      return content
    }).join('\n\n---\n\n')
  }

  const exportAsHTML = (options: ExportOptions): string => {
    const htmlContent = messages.map(msg => {
      const timestamp = options.includeTimestamps ? 
        `<small>${new Date(msg.timestamp).toLocaleString()}</small><br>` : ''
      
      if (options.codeOnly && msg.metadata?.codeBlocks?.length) {
        return msg.metadata.codeBlocks.map(block => 
          `<pre><code class="language-${block.language}">${block.code}</code></pre>`
        ).join('')
      }

      return `
        <div class="message ${msg.role}">
          ${timestamp}
          <strong>${msg.role === 'user' ? 'User' : 'Assistant'}:</strong>
          <div>${msg.content.replace(/\n/g, '<br>')}</div>
        </div>
      `
    }).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Conversation Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .message { margin: 20px 0; padding: 10px; border-left: 3px solid #ccc; }
          .user { border-left-color: #007bff; }
          .assistant { border-left-color: #28a745; }
          pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>AI Conversation Export</h1>
        ${htmlContent}
      </body>
      </html>
    `
  }

  const exportAsJSON = (options: ExportOptions): string => {
    const data = {
      exportedAt: new Date().toISOString(),
      options,
      messages: options.codeOnly ? 
        messages.filter(m => m.metadata?.codeBlocks?.length).map(m => ({
          ...m,
          codeBlocks: m.metadata?.codeBlocks
        })) : messages
    }
    return JSON.stringify(data, null, 2)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      image: uploadedImage || undefined,
      timestamp: Date.now(),
      metadata: {
        language: selectedLanguage
      }
    }

    setMessages((prev) => [...prev, userMessage])
    setPrompt("")
    setUploadedImage(null)
    setIsGenerating(true)

    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }
    }, 100)

    try {
      const conversationContext = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const response = await fetch("/api/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          image: userMessage.image,
          conversationHistory: conversationContext,
          language: selectedLanguage,
        }),
      })

      const data = await response.json()

      const responseContent = data.response || data.error || "No response received"
      const codeBlocks = parseCodeBlocks(responseContent)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: Date.now(),
        metadata: {
          language: selectedLanguage,
          codeBlocks
        }
      }

      setMessages((prev) => [...prev, assistantMessage])

      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }
        }
      }, 100)
    } catch (error) {
      console.error("Request failed:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered a network error. Please check your connection and try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
              setUploadedImage(e.target?.result as string)
            }
            reader.readAsDataURL(file)
          }
          break
        }
      }
    }
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const downloadContent = (content: string, filename = "ai-response.txt") => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Enhanced message rendering with syntax highlighting
  const renderMessageContent = (message: Message) => {
    if (!message.metadata?.codeBlocks?.length) {
      return <div className="whitespace-pre-wrap break-words">{message.content}</div>
    }

    const parts = message.content.split(/```[\w]*\n[\s\S]*?```/)
    const codeBlocks = message.metadata.codeBlocks
    let codeIndex = 0

    return (
      <div className="space-y-3">
        {parts.map((part, index) => {
          const elements = []
          
          if (part.trim()) {
            elements.push(
              <div key={`text-${index}`} className="whitespace-pre-wrap break-words">
                {part.trim()}
              </div>
            )
          }

          if (codeIndex < codeBlocks.length && index < parts.length - 1) {
            const block = codeBlocks[codeIndex]
            elements.push(
              <div key={`code-${codeIndex}`} className="relative group">
                <div className="flex items-center justify-between bg-muted px-3 py-2 rounded-t-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {block.language.toUpperCase()}
                    </Badge>
                    {block.explanation && (
                      <span className="text-xs text-muted-foreground">
                        {block.explanation}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(block.code)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadContent(block.code, `code.${getFileExtension(block.language)}`)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <SyntaxHighlighter
                  language={mapLanguageForPrism(block.language)}
                  style={theme === 'dark' ? oneDark : oneLight}
                  customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    fontSize: '14px'
                  }}
                  showLineNumbers={block.code.split('\n').length > 5}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {block.code}
                </SyntaxHighlighter>
              </div>
            )
            codeIndex++
          }

          return elements
        })}
      </div>
    )
  }

  const mapLanguageForPrism = (language: string): string => {
    const mapping: Record<string, string> = {
      'ampscript': 'markup',
      'ssjs': 'javascript',
      'csharp': 'csharp',
      'typescript': 'typescript',
      'javascript': 'javascript',
      'sql': 'sql',
      'css': 'css',
      'html': 'markup',
      'json': 'json',
      'xml': 'xml',
      'python': 'python',
      'java': 'java'
    }
    return mapping[language.toLowerCase()] || 'text'
  }

  const getFileExtension = (language: string): string => {
    const extensions: Record<string, string> = {
      'javascript': 'js',
      'typescript': 'ts',
      'ampscript': 'amp',
      'ssjs': 'ssjs',
      'sql': 'sql',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'xml': 'xml',
      'python': 'py',
      'java': 'java',
      'csharp': 'cs'
    }
    return extensions[language.toLowerCase()] || 'txt'
  }

  return (
    <Card className="w-full h-[800px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              AI Code Generator
            </CardTitle>
            <CardDescription>
              Multi-language AI assistant with syntax highlighting and advanced export features
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedLanguage} onValueChange={(value: CodeLanguage) => setSelectedLanguage(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${lang.color}`} />
                      {lang.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* Enhanced Header with Stats and Export */}
        <div className="flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="px-3 py-2 bg-muted rounded-md">
              <span className="text-sm font-medium">ChatGPT-4o (Syngenta Enterprise)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {messages.length} messages
              </Badge>
              {messages.some(m => m.metadata?.codeBlocks?.length) && (
                <Badge variant="outline" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  {messages.reduce((acc, m) => acc + (m.metadata?.codeBlocks?.length || 0), 0)} code blocks
                </Badge>
              )}
            </div>
          </div>
          
          {messages.length > 0 && (
            <Tabs defaultValue="export" className="w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="export" className="text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Options
                </TabsTrigger>
              </TabsList>
              <TabsContent value="export" className="mt-2">
                <div className="flex gap-2">
                  <Select 
                    value={exportOptions.format} 
                    onValueChange={(value: ExportFormat) => 
                      setExportOptions(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="txt">TXT</SelectItem>
                      <SelectItem value="md">MD</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={() => exportConversation(exportOptions.format, exportOptions)}
                    className="text-xs"
                  >
                    Export
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="mt-2">
                <div className="flex gap-2 text-xs">
                  <Button
                    variant={exportOptions.codeOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExportOptions(prev => ({ ...prev, codeOnly: !prev.codeOnly }))}
                  >
                    Code Only
                  </Button>
                  <Button
                    variant={exportOptions.includeTimestamps ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExportOptions(prev => ({ ...prev, includeTimestamps: !prev.includeTimestamps }))}
                  >
                    Timestamps
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-4 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Welcome to Syngenta AI Assistant</p>
                  <p>Ask me anything - coding questions, explanations, tutorials, or general knowledge!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-orange-500 text-white">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                      <div
                        className={`rounded-lg p-4 ${
                          message.role === "user" ? "bg-orange-500 text-white ml-auto" : "bg-muted"
                        }`}
                      >
                        {message.image && (
                          <img
                            src={message.image || "/placeholder.svg"}
                            alt="Uploaded"
                            className="max-w-full h-auto rounded mb-2 max-h-48 object-contain"
                          />
                        )}
                        {renderMessageContent(message)}
                      </div>

                      {message.role === "assistant" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(message.content)}
                            className="h-8"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadContent(message.content)}
                            className="h-8"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-blue-500 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}

              {isGenerating && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-orange-500 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-shrink-0 space-y-3">
          {uploadedImage && (
            <div className="relative inline-block">
              <img src={uploadedImage || "/placeholder.svg"} alt="Upload preview" className="max-h-20 rounded border" />
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={() => setUploadedImage(null)}
              >
                ×
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  placeholder={`Ask me anything about ${supportedLanguages.find(l => l.value === selectedLanguage)?.label} or any other topic...`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onPaste={handlePaste}
                  className="min-h-[60px] resize-none pr-20"
                  maxLength={2000}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleGenerate()
                    }
                  }}
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs">
                    <div className={`h-2 w-2 rounded-full mr-1 ${supportedLanguages.find(l => l.value === selectedLanguage)?.color}`} />
                    {supportedLanguages.find(l => l.value === selectedLanguage)?.label}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Tip: Use ``` to format code blocks</span>
                <span>{prompt.length}/2000 characters</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                title="Upload image (or paste from clipboard)"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>

              <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>
      </CardContent>
    </Card>
  )
}
