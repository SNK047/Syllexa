import type { AIProvider, AIModel, ChatMessage } from "./types";

const OPENROUTER_MODELS: AIModel[] = [
  {
    id: "openrouter/free",
    name: "Auto Router",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 200000,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Auto-selects the best free model. Most reliable option — recommended.",
    pricing: "Free",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra",
    provider: "openrouter",
    speed: "medium",
    contextWindow: 1048576,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "NVIDIA's 550B flagship. Deep reasoning, long-context. Best free model for accuracy.",
    pricing: "Free",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 262144,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "NVIDIA's 120B model. Balanced speed and quality. Strong for academic work.",
    pricing: "Free",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT-OSS 20B",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "OpenAI's open-weight model. General coding and reasoning.",
    pricing: "Free",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 262144,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Google's Gemma 4. Good for general knowledge and math.",
    pricing: "Free",
  },
  {
    id: "poolside/laguna-m.1:free",
    name: "Poolside Laguna M.1",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 262144,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Agentic coding model. Best for programming tasks.",
    pricing: "Free",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 256000,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Cohere's code model. Good for code generation and debugging.",
    pricing: "Free",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano 12B VL",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 128000,
    maxOutput: 4096,
    supportsImages: true,
    supportsCode: false,
    description: "Vision + language. Upload screenshots or diagrams for analysis.",
    pricing: "Free",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 128000,
    maxOutput: 4096,
    supportsImages: false,
    supportsCode: false,
    description: "Lightweight. Quick questions and fast responses.",
    pricing: "Free",
  },
];

export function createOpenRouterProvider(): AIProvider | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  return {
    id: "openrouter",
    name: "OpenRouter",
    icon: "🌐",
    color: "#6366F1",
    isAvailable: true,
    models: OPENROUTER_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://syllexa.vercel.app",
          "X-Title": "Syllexa AI",
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter: ${res.status} - ${err}`);
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
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.choices?.[0]?.delta?.content;
              if (text) yield text;
            } catch {}
          }
        }
      }
    },
  };
}
