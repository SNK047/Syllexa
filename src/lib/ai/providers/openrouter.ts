import type { AIProvider, AIModel, ChatMessage } from "./types";

const OPENROUTER_MODELS: AIModel[] = [
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek V3",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Powerful general model with excellent coding and reasoning. Free.",
    pricing: "Free",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    provider: "openrouter",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Advanced reasoning model. Step-by-step problem solving. Free.",
    pricing: "Free",
  },
  {
    id: "qwen/qwen3-235b-a22b:free",
    name: "Qwen 3 235B",
    provider: "openrouter",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Massive MoE model from Alibaba. Excellent multilingual. Free.",
    pricing: "Free",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Meta's latest Llama. Strong general performance. Free.",
    pricing: "Free",
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Fast Mistral model with vision. Free.",
    pricing: "Free",
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Google's open model. Vision capable. Free.",
    pricing: "Free",
  },
  {
    id: "microsoft/phi-4-reasoning-plus:free",
    name: "Phi-4 Reasoning+",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 32768,
    maxOutput: 16384,
    supportsImages: false,
    supportsCode: true,
    description: "Microsoft's reasoning specialist. Math & code. Free.",
    pricing: "Free",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "openrouter",
    speed: "medium",
    contextWindow: 200000,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Anthropic's best model. Exceptional at analysis and coding.",
    pricing: "Paid",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 128000,
    maxOutput: 16384,
    supportsImages: true,
    supportsCode: true,
    description: "Fast, affordable OpenAI model.",
    pricing: "Paid",
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
          "X-Title": "Syllexa AI Chat",
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
        throw new Error(`OpenRouter API error: ${res.status} - ${err}`);
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
