import type { AIProvider, AIModel, ChatMessage } from "./types";

const OLLAMA_MODELS: AIModel[] = [
  {
    id: "gpt-oss:120b",
    name: "GPT-OSS 120B",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "OpenAI's 120B open-weight model. Best general-purpose model.",
    pricing: "Pay-per-use",
  },
  {
    id: "gpt-oss:20b",
    name: "GPT-OSS 20B",
    provider: "ollama",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Lightweight OpenAI model. Fast for quick questions.",
    pricing: "Pay-per-use",
  },
  {
    id: "nemotron-3-ultra",
    name: "Nemotron 3 Ultra",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "NVIDIA's largest model. Deep reasoning and analysis.",
    pricing: "Pay-per-use",
  },
  {
    id: "nemotron-3-super",
    name: "Nemotron 3 Super",
    provider: "ollama",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "NVIDIA's fast model. Good balance of speed and quality.",
    pricing: "Pay-per-use",
  },
  {
    id: "nemotron-3-nano:30b",
    name: "Nemotron 3 Nano",
    provider: "ollama",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "NVIDIA's compact model. Fastest for simple tasks.",
    pricing: "Pay-per-use",
  },
  {
    id: "gemma4:31b",
    name: "Gemma 4 31B",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Google's latest open model. Strong general performance.",
    pricing: "Pay-per-use",
  },
  {
    id: "minimax-m3",
    name: "MiniMax M3",
    provider: "ollama",
    speed: "slow",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "MiniMax's flagship. Strong at long-context tasks.",
    pricing: "Pay-per-use",
  },
  {
    id: "minimax-m2.5",
    name: "MiniMax M2.5",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "MiniMax's balanced model. Good for general use.",
    pricing: "Pay-per-use",
  },
];

export function createOllamaProvider(): AIProvider | null {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) return null;

  return {
    id: "ollama",
    name: "Ollama",
    icon: "🦙",
    color: "#FFFFFF",
    isAvailable: true,
    models: OLLAMA_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch("https://ollama.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          stream: true,
          options: {
            temperature,
            num_predict: maxTokens,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Ollama: ${res.status} - ${err}`);
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
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                yield data.message.content;
              }
            } catch {}
          }
        }
      }
    },
  };
}
