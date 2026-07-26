import type { AIProvider, AIModel, ChatMessage } from "./types";

const GEMINI_MODELS: AIModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    speed: "fast",
    contextWindow: 1048576,
    maxOutput: 65536,
    supportsImages: true,
    supportsCode: true,
    description: "Fast, efficient model with thinking capabilities. Great for coding and analysis.",
    pricing: "Free tier available",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    speed: "medium",
    contextWindow: 1048576,
    maxOutput: 65536,
    supportsImages: true,
    supportsCode: true,
    description: "Most capable Gemini model. Best for complex reasoning and long-context tasks.",
    pricing: "Free tier available",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    speed: "fast",
    contextWindow: 1048576,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Previous gen fast model. Reliable for general tasks.",
    pricing: "Free tier available",
  },
];

export function createGeminiProvider(): AIProvider | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY;
  if (!apiKey) return null;

  return {
    id: "gemini",
    name: "Google Gemini",
    icon: "✦",
    color: "#4285F4",
    isAvailable: true,
    models: GEMINI_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const systemMsg = systemPrompt || messages.find((m) => m.role === "system")?.content;

      const body: any = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      };

      if (systemMsg) {
        body.systemInstruction = { parts: [{ text: systemMsg }] };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${res.status} - ${err}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield text;
            } catch {}
          }
        }
      }
    },
  };
}
