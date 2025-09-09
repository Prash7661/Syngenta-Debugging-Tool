export const SYNGENTA_API_CONFIG = {
  url: process.env.AZURE_OPENAI_ENDPOINT || "https://corp-commercial-openai.openai.azure.com/openai/deployments/corp-commercial-gpt-4o/chat/completions?api-version=2025-01-01-preview",
  key: process.env.AZURE_OPENAI_API_KEY || "",
  model: "gpt-4o",
  maxTokens: 2000,
  temperature: 0.7,
  systemPrompt:
    "You are an AI assistant specialized in helping with Syngenta Group development tasks. You can answer any question, provide code solutions, explain concepts, and assist with general inquiries.",
}

export async function callSyngentaAPI(
  userContent: string,
  context?: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
) {
  try {
    console.log("[v0] Making API call to:", SYNGENTA_API_CONFIG.url)

    const messages = [
      {
        role: "system",
        content: context || SYNGENTA_API_CONFIG.systemPrompt,
      },
      ...conversationHistory,
      {
        role: "user",
        content: userContent,
      },
    ]

    console.log("[v0] Request payload:", {
      model: SYNGENTA_API_CONFIG.model,
      messages,
      max_tokens: SYNGENTA_API_CONFIG.maxTokens,
      temperature: SYNGENTA_API_CONFIG.temperature,
    })

    const response = await fetch(SYNGENTA_API_CONFIG.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": SYNGENTA_API_CONFIG.key,
      },
      body: JSON.stringify({
        model: SYNGENTA_API_CONFIG.model,
        messages,
        max_tokens: SYNGENTA_API_CONFIG.maxTokens,
        temperature: SYNGENTA_API_CONFIG.temperature,
      }),
    })

    console.log("[v0] Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] Error response body:", errorText)
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("[v0] API response data:", data)

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("No valid response content received from API")
    }

    return content
  } catch (error) {
    console.error("[v0] Syngenta API Error:", error)
    return `I apologize, but I encountered an error while processing your request. Please try again. Error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}

export async function callSyngentaAPIWithImage(
  userContent: string,
  imageBase64: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
) {
  try {
    const messages = [
      {
        role: "system",
        content:
          "You are an AI assistant specialized in helping with Syngenta Group development tasks. You can analyze images and answer questions about them.",
      },
      ...conversationHistory,
      {
        role: "user",
        content: [
          { type: "text", text: userContent },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      },
    ]

    const response = await fetch(SYNGENTA_API_CONFIG.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": SYNGENTA_API_CONFIG.key,
      },
      body: JSON.stringify({
        model: SYNGENTA_API_CONFIG.model,
        messages,
        max_tokens: SYNGENTA_API_CONFIG.maxTokens,
        temperature: SYNGENTA_API_CONFIG.temperature,
      }),
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || "Unable to analyze the image."
  } catch (error) {
    console.error("[v0] Image API Error:", error)
    return "I apologize, but I couldn't analyze the image. Please try again."
  }
}
