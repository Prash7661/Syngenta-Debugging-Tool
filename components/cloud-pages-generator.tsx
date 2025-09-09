"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Copy, Download, Settings, MessageSquare, Sparkles } from "lucide-react"

interface ConfigurationOptions {
  pageSettings: {
    pageName: string
    publishedURL: string
    pageType: "landing" | "form" | "thank-you" | "subscription"
  }
  codeResources: {
    javascript: { enabled: boolean; fileName: string }
    css: { enabled: boolean; fileName: string }
    html: { enabled: boolean; fileName: string }
    json: { enabled: boolean; fileName: string }
    xml: { enabled: boolean; fileName: string }
    rss: { enabled: boolean; fileName: string }
    text: { enabled: boolean; fileName: string }
  }
  advancedOptions: {
    framework: "vanilla" | "bootstrap" | "tailwind"
    responsiveDesign: boolean
    ampscriptIntegration: boolean
    formHandling: boolean
  }
}

interface ConversationMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface GeneratedOutput {
  pages: Array<{
    name: string
    url: string
    htmlCode: string
    description: string
  }>
  codeResources: Array<{
    type: string
    fileName: string
    code: string
    description: string
  }>
  integrationNotes: string
  testingGuidelines: string
}

export function CloudPagesGenerator() {
  const [configuration, setConfiguration] = useState<ConfigurationOptions>({
    pageSettings: {
      pageName: "Main Landing Page",
      publishedURL: "https://example.com/page",
      pageType: "landing",
    },
    codeResources: {
      javascript: { enabled: false, fileName: "scripts.js" },
      css: { enabled: false, fileName: "styles.css" },
      html: { enabled: true, fileName: "index.html" },
      json: { enabled: false, fileName: "data.json" },
      xml: { enabled: false, fileName: "config.xml" },
      rss: { enabled: false, fileName: "feed.rss" },
      text: { enabled: false, fileName: "content.txt" },
    },
    advancedOptions: {
      framework: "tailwind",
      responsiveDesign: true,
      ampscriptIntegration: false,
      formHandling: false,
    },
  })

  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [currentPrompt, setCurrentPrompt] = useState("")
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("configuration")

  const handleGeneratePages = async () => {
    if (!currentPrompt.trim()) return

    setIsGenerating(true)

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: "user",
      content: currentPrompt,
      timestamp: new Date(),
    }

    setConversationHistory((prev) => [...prev, userMessage])

    try {
      // Convert configuration to new format
      const pageConfig = {
        pageSettings: {
          pageName: configuration.pageSettings.pageName,
          publishedURL: configuration.pageSettings.publishedURL,
          pageType: configuration.pageSettings.pageType,
          title: configuration.pageSettings.pageName
        },
        codeResources: {
          css: {
            framework: configuration.advancedOptions.framework,
            customCSS: ""
          },
          javascript: {
            customJS: configuration.codeResources.javascript.enabled ? "// Custom JavaScript" : ""
          }
        },
        advancedOptions: {
          responsive: configuration.advancedOptions.responsiveDesign,
          mobileFirst: configuration.advancedOptions.responsiveDesign,
          accessibility: false,
          seoOptimized: false,
          ampscriptEnabled: configuration.advancedOptions.ampscriptIntegration
        },
        layout: {
          structure: "single-column" as const,
          header: true,
          footer: true
        },
        components: configuration.advancedOptions.formHandling ? [
          {
            id: "contact-form",
            type: "form" as const,
            position: 1,
            props: {
              fields: [
                { name: "email", label: "Email", type: "email", required: true }
              ]
            }
          }
        ] : []
      }

      // Determine generation type based on configuration
      let generationType = "config"
      if (configuration.advancedOptions.responsiveDesign) {
        generationType = "mobile-first"
      }
      if (configuration.advancedOptions.ampscriptIntegration) {
        generationType = "ampscript"
      }

      const response = await fetch("/api/cloud-pages/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: generationType,
          config: pageConfig,
          framework: configuration.advancedOptions.framework,
          ampscriptConfig: configuration.advancedOptions.ampscriptIntegration ? {
            dataExtensions: ["Subscribers"]
          } : undefined
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate pages")
      }

      const result = await response.json()
      const data = result.data

      const output: GeneratedOutput = {
        pages: data.pages.map((page: any) => ({
          name: page.metadata.pageName,
          url: configuration.pageSettings.publishedURL,
          htmlCode: page.html,
          description: `Generated ${configuration.pageSettings.pageType} page with ${page.metadata.framework} framework${configuration.advancedOptions.responsiveDesign ? " (responsive)" : ""}${configuration.advancedOptions.ampscriptIntegration ? " with AMPScript" : ""}`,
        })),
        codeResources: [
          {
            type: "CSS",
            fileName: "styles.css",
            code: data.pages[0].css,
            description: `Generated CSS with ${configuration.advancedOptions.framework} framework${configuration.advancedOptions.responsiveDesign ? " and responsive design" : ""}`
          },
          ...(data.pages[0].javascript ? [{
            type: "JavaScript",
            fileName: "scripts.js", 
            code: data.pages[0].javascript,
            description: "Generated JavaScript for interactive functionality"
          }] : []),
          ...(data.pages[0].ampscript ? [{
            type: "AMPScript",
            fileName: "ampscript.amp",
            code: data.pages[0].ampscript,
            description: "Generated AMPScript for SFMC integration"
          }] : []),
          ...data.codeResources.map((resource: any) => ({
            type: resource.type.toUpperCase(),
            fileName: resource.name,
            code: resource.content,
            description: resource.description || `Generated ${resource.type} resource`
          }))
        ],
        integrationNotes: data.integrationNotes,
        testingGuidelines: data.testingGuidelines,
      }

      setGeneratedOutput(output)

      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Generated ${output.pages.length} page(s) and ${output.codeResources.length} code resource(s) based on your request. The ${configuration.pageSettings.pageType} page includes ${configuration.advancedOptions.framework} framework styling${configuration.advancedOptions.responsiveDesign ? " with mobile-first responsive design" : ""}${configuration.advancedOptions.ampscriptIntegration ? " and AMPScript integration for dynamic content" : ""}. The page is optimized for SFMC deployment.`,
        timestamp: new Date(),
      }

      setConversationHistory((prev) => [...prev, assistantMessage])
      setActiveTab("output")
    } catch (error) {
      console.error("Generation error:", error)
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "I encountered an error while generating your pages. Please try again with a different prompt or check your configuration settings.",
        timestamp: new Date(),
      }
      setConversationHistory((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      setCurrentPrompt("")
    }
  }

  const generateFallbackHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${configuration.pageSettings.pageName}</title>
    ${configuration.codeResources.css.enabled ? `<link rel="stylesheet" href="${configuration.codeResources.css.fileName}">` : ""}
</head>
<body>
    <div class="container">
        <h1>Welcome to ${configuration.pageSettings.pageName}</h1>
        <p>This ${configuration.pageSettings.pageType} page was generated using Syngenta's AI-powered tools.</p>
        ${configuration.advancedOptions.formHandling ? '<form class="contact-form"><input type="email" placeholder="Enter your email"><button type="submit">Submit</button></form>' : ""}
    </div>
    ${configuration.codeResources.javascript.enabled ? `<script src="${configuration.codeResources.javascript.fileName}"></script>` : ""}
</body>
</html>`
  }

  const generateCodeResource = (type: string, prompt: string) => {
    switch (type) {
      case "css":
        return `/* Generated CSS for ${configuration.pageSettings.pageName} */
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
h1 { color: #2563eb; font-size: 2.5rem; margin-bottom: 1rem; }
.contact-form { margin-top: 2rem; }
.contact-form input { padding: 0.75rem; margin-right: 1rem; border: 1px solid #ccc; }
.contact-form button { padding: 0.75rem 1.5rem; background: #059669; color: white; border: none; cursor: pointer; }
${configuration.advancedOptions.responsiveDesign ? "@media (max-width: 768px) { .container { padding: 1rem; } h1 { font-size: 2rem; } }" : ""}`

      case "javascript":
        return `// Generated JavaScript for ${configuration.pageSettings.pageName}
document.addEventListener('DOMContentLoaded', function() {
    console.log('${configuration.pageSettings.pageName} loaded successfully');
    
    ${
      configuration.advancedOptions.formHandling
        ? `
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            if (email) {
                alert('Thank you for your submission!');
                // Add SFMC integration here
            }
        });
    }`
        : ""
    }
});`

      default:
        return `// Generated ${type.toUpperCase()} resource
// Content based on prompt: ${prompt}
// Configuration: ${JSON.stringify(configuration, null, 2)}`
    }
  }

  const generateIntegrationNotes = () => {
    return `SFMC Integration Instructions:
1. Upload HTML content to Cloud Pages
2. ${configuration.codeResources.css.enabled ? "Link CSS file in Content Builder" : "Inline CSS included in HTML"}
3. ${configuration.codeResources.javascript.enabled ? "Upload JavaScript to Portfolio and reference in page" : "No external JavaScript required"}
4. ${configuration.advancedOptions.ampscriptIntegration ? "AMPScript variables ready for personalization" : "Static content - no AMPScript integration"}
5. Test page functionality before publishing`
  }

  const generateTestingGuidelines = () => {
    return `Testing Checklist:
✓ Responsive design across devices
✓ Form validation and submission
✓ Cross-browser compatibility
✓ Page load performance
✓ SFMC data integration
✓ Email capture functionality`
  }

  const copyAllCode = () => {
    if (!generatedOutput) return
    const allCode =
      generatedOutput.pages.map((p) => p.htmlCode).join("\n\n") +
      "\n\n" +
      generatedOutput.codeResources.map((r) => `/* ${r.fileName} */\n${r.code}`).join("\n\n")
    navigator.clipboard.writeText(allCode)
  }

  const downloadAllFiles = () => {
    if (!generatedOutput) return
    // Create downloadable ZIP functionality would go here
    const blob = new Blob([JSON.stringify(generatedOutput, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "syngenta-generated-pages.json"
    a.click()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
          Cloud Pages Generator
        </CardTitle>
        <CardDescription>Create intelligent SFMC landing pages with AI assistance</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="conversation" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="output" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Generated Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Page Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Page Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pageName">Page Name</Label>
                    <Input
                      id="pageName"
                      value={configuration.pageSettings.pageName}
                      onChange={(e) =>
                        setConfiguration((prev) => ({
                          ...prev,
                          pageSettings: { ...prev.pageSettings, pageName: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="publishedURL">Published URL</Label>
                    <Input
                      id="publishedURL"
                      value={configuration.pageSettings.publishedURL}
                      onChange={(e) =>
                        setConfiguration((prev) => ({
                          ...prev,
                          pageSettings: { ...prev.pageSettings, publishedURL: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="pageType">Page Type</Label>
                    <Select
                      value={configuration.pageSettings.pageType}
                      onValueChange={(value: any) =>
                        setConfiguration((prev) => ({
                          ...prev,
                          pageSettings: { ...prev.pageSettings, pageType: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landing">Landing Page</SelectItem>
                        <SelectItem value="form">Form Page</SelectItem>
                        <SelectItem value="thank-you">Thank You Page</SelectItem>
                        <SelectItem value="subscription">Subscription Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Advanced Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="framework">Framework</Label>
                    <Select
                      value={configuration.advancedOptions.framework}
                      onValueChange={(value: any) =>
                        setConfiguration((prev) => ({
                          ...prev,
                          advancedOptions: { ...prev.advancedOptions, framework: value },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vanilla">Vanilla CSS</SelectItem>
                        <SelectItem value="bootstrap">Bootstrap</SelectItem>
                        <SelectItem value="tailwind">Tailwind CSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="responsive"
                      checked={configuration.advancedOptions.responsiveDesign}
                      onCheckedChange={(checked) =>
                        setConfiguration((prev) => ({
                          ...prev,
                          advancedOptions: { ...prev.advancedOptions, responsiveDesign: checked },
                        }))
                      }
                    />
                    <Label htmlFor="responsive">Mobile-First Responsive Design</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ampscript"
                      checked={configuration.advancedOptions.ampscriptIntegration}
                      onCheckedChange={(checked) =>
                        setConfiguration((prev) => ({
                          ...prev,
                          advancedOptions: { ...prev.advancedOptions, ampscriptIntegration: checked },
                        }))
                      }
                    />
                    <Label htmlFor="ampscript">AMPScript Integration</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="formHandling"
                      checked={configuration.advancedOptions.formHandling}
                      onCheckedChange={(checked) =>
                        setConfiguration((prev) => ({
                          ...prev,
                          advancedOptions: { ...prev.advancedOptions, formHandling: checked },
                        }))
                      }
                    />
                    <Label htmlFor="formHandling">Form Handling</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Code Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Code Resources</CardTitle>
                <CardDescription>Select which file types to generate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(configuration.codeResources).map(([type, config]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={type}
                          checked={config.enabled}
                          onCheckedChange={(checked) =>
                            setConfiguration((prev) => ({
                              ...prev,
                              codeResources: {
                                ...prev.codeResources,
                                [type]: {
                                  ...prev.codeResources[type as keyof typeof prev.codeResources],
                                  enabled: checked,
                                },
                              },
                            }))
                          }
                        />
                        <Label htmlFor={type} className="text-sm font-medium">
                          {type.toUpperCase()}
                        </Label>
                      </div>
                      {config.enabled && (
                        <Input
                          value={config.fileName}
                          onChange={(e) =>
                            setConfiguration((prev) => ({
                              ...prev,
                              codeResources: {
                                ...prev.codeResources,
                                [type]: {
                                  ...prev.codeResources[type as keyof typeof prev.codeResources],
                                  fileName: e.target.value,
                                },
                              },
                            }))
                          }
                          placeholder={`${type}.${type === "javascript" ? "js" : type}`}
                          className="text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Describe what you want to create. Examples: "Create 3 landing pages for agricultural products with
                  contact forms" or "Generate a subscription page with modern design"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    {conversationHistory.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === "user" ? "bg-orange-500 text-white" : "bg-white dark:bg-gray-800 border"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prompt Input */}
                <div className="space-y-3">
                  <Textarea
                    value={currentPrompt}
                    onChange={(e) => setCurrentPrompt(e.target.value)}
                    placeholder="What do you want to create? Describe your landing page, forms, styling preferences, and any specific requirements..."
                    className="min-h-[120px]"
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{currentPrompt.length}/2000 characters</span>
                    <Button
                      onClick={handleGeneratePages}
                      disabled={isGenerating || !currentPrompt.trim()}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isGenerating ? "Generating..." : "Generate Pages"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="output" className="space-y-4">
            {generatedOutput ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                    Generated Output
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAllCode}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy All
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadAllFiles}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>

                {/* Generated Pages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generated Pages ({generatedOutput.pages.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="0" className="w-full">
                      <TabsList>
                        {generatedOutput.pages.map((page, index) => (
                          <TabsTrigger key={index} value={index.toString()}>
                            {page.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {generatedOutput.pages.map((page, index) => (
                        <TabsContent key={index} value={index.toString()} className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{page.description}</p>
                            <Badge variant="outline">{page.url}</Badge>
                          </div>
                          <pre className="bg-gray-900 dark:bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                            <code>{page.htmlCode}</code>
                          </pre>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Code Resources */}
                {generatedOutput.codeResources.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Code Resources ({generatedOutput.codeResources.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="0" className="w-full">
                        <TabsList>
                          {generatedOutput.codeResources.map((resource, index) => (
                            <TabsTrigger key={index} value={index.toString()}>
                              {resource.fileName}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {generatedOutput.codeResources.map((resource, index) => (
                          <TabsContent key={index} value={index.toString()} className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge>{resource.type}</Badge>
                                <span className="text-sm font-medium">{resource.fileName}</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{resource.description}</p>
                            </div>
                            <pre className="bg-gray-900 dark:bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                              <code>{resource.code}</code>
                            </pre>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                )}

                {/* Integration Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Integration Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm whitespace-pre-wrap">{generatedOutput.integrationNotes}</pre>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Testing Guidelines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm whitespace-pre-wrap">{generatedOutput.testingGuidelines}</pre>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Code className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 text-center">
                    No generated output yet. Configure your settings and use the AI Assistant to create pages.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
