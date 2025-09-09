"use client"

import Image from "next/image"
import { useTheme } from "next-themes"

export function SyngentaLogo({ className = "h-8 w-auto" }: { className?: string }) {
  const { theme, resolvedTheme } = useTheme()

  // Determine if we're in dark mode
  const isDark = resolvedTheme === "dark"

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`rounded-lg p-2 transition-colors duration-200 ${
          isDark ? "bg-white shadow-sm border border-gray-200" : "bg-transparent"
        }`}
      >
        <Image src="/syngenta-logo.png" alt="Syngenta Group" width={200} height={60} className="h-8 w-auto" priority />
      </div>
      <div className="flex flex-col">
        <h1 className={`text-xl font-bold transition-colors duration-200 ${isDark ? "text-white" : "text-gray-900"}`}>
          Developer Tools Platform
        </h1>
        <p className={`text-sm transition-colors duration-200 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          AI-powered development and debugging tools for Syngenta
        </p>
      </div>
    </div>
  )
}
