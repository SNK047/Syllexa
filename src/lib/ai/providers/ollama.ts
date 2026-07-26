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
    description: "OpenAI's 120B open-weight model. Best general-purpose model on Ollama.",
    pricing: "Pay-per-use",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "DeepSeek flagship. Excellent for reasoning, math, and research.",
    pricing: "Pay-per-use",
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "ollama",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Fast DeepSeek. Good balance of speed and accuracy.",
    pricing: "Pay-per-use",
  },
  {
    id: "qwen3.5:397b",
    name: "Qwen 3.5 397B",
    provider: "ollama",
    speed: "slow",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Alibaba's massive 397B model. Best for complex tasks.",
    pricing: "Pay-per-use",
  },
  {
    id: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Moonshot's coding model. Best for programming tasks.",
    pricing: "Pay-per-use",
  },
  {
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Moonshot's general model. Strong reasoning.",
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
    description: "NVIDIA's largest model. Deep reasoning.",
    pricing: "Pay-per-use",
  },
  {
    id: "mistral-large-3:675b",
    name: "Mistral Large 3",
    provider: "ollama",
    speed: "slow",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Mistral's 675B flagship. Excellent multilingual.",
    pricing: "Pay-per-use",
  },
  {
    id: "glm-5.2",
    name: "GLM 5.2",
    provider: "ollama",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Zhipu AI's latest. Strong at Chinese and English.",
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
