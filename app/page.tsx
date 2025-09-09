"use client"

import { useState } from "react"
import { SyngentaLogo } from "@/components/syngenta-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { AICodeGenerator } from "@/components/ai-code-generator"
import { DebuggingTool } from "@/components/debugging-tool"
import { CloudPagesGenerator } from "@/components/cloud-pages-generator"
import { Button } from "@/components/ui/button"
import { Code, Bug, Cloud } from "lucide-react"

type ActiveTool = "ai-generator" | "debugging" | "cloud-pages"

export default function Home() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("ai-generator")

  const tools = [
    {
      id: "ai-generator" as ActiveTool,
      name: "AI Code Generator",
      icon: Code,
      description: "Generate code using AI with multiple input types and model options",
    },
    {
      id: "debugging" as ActiveTool,
      name: "Debugging Tool",
      icon: Bug,
      description: "Debug and analyze your AMPScript, SSJS, and HTML code with AI assistance",
    },
    {
      id: "cloud-pages" as ActiveTool,
      name: "Cloud Pages Generator",
      icon: Cloud,
      description: "Create and manage SFMC landing pages and code resources",
    },
  ]

  const renderActiveTool = () => {
    switch (activeTool) {
      case "ai-generator":
        return <AICodeGenerator />
      case "debugging":
        return <DebuggingTool />
      case "cloud-pages":
        return <CloudPagesGenerator />
      default:
        return <AICodeGenerator />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <SyngentaLogo />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Tool Navigation */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {tools.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id
              return (
                <Button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  variant={isActive ? "default" : "outline"}
                  className={`flex-1 sm:flex-none px-6 py-3 h-auto flex-col gap-2 ${
                    isActive ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tool.name}</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Active Tool */}
        <div className="max-w-6xl mx-auto">{renderActiveTool()}</div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 Syngenta Group. AI-powered development and debugging tools.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
