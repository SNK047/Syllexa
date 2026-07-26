import type { AIProvider, AIModel, ChatMessage } from "./types";

const OPENROUTER_MODELS: AIModel[] = [
  {
    id: "openrouter/free",
    name: "Auto Router",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Auto-selects the best free model for your request. Most reliable option.",
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
    description: "NVIDIA's largest model. Deep research, long-context. Free.",
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
    description: "Agentic coding model. Complex software engineering. Free.",
    pricing: "Free",
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT-OSS 120B",
    provider: "openrouter",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "OpenAI's open-weight model. General coding & reasoning. Free.",
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
    description: "Meta's Llama. General purpose, multilingual. Free.",
    pricing: "Free",
  },
  {
    id: "google/gemma-4-31b:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 262144,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Google's latest Gemma. Multilingual, general use. Free.",
    pricing: "Free",
  },
  {
    id: "moonshotai/kimi-k2.5:free",
    name: "Kimi K2.5",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 262144,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Moonshot AI. Reasoning & agent tasks. Free.",
    pricing: "Free",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano 12B VL",
    provider: "openrouter",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 4096,
    supportsImages: true,
    supportsCode: false,
    description: "Vision + language. Image understanding. Free.",
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
