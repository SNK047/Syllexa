import type { AIProvider, AIModel, ChatMessage } from "./types";

const QWEN_MODELS: AIModel[] = [
  {
    id: "qwen3.7-flash",
    name: "Qwen 3.7 Flash",
    provider: "qwen",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Latest flash model. Fastest with strong quality.",
    pricing: "Pay-per-use",
  },
  {
    id: "qwen3.7-plus",
    name: "Qwen 3.7 Plus",
    provider: "qwen",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Balanced quality and speed. Great all-rounder.",
    pricing: "Pay-per-use",
  },
  {
    id: "qwen3.7-max",
    name: "Qwen 3.7 Max",
    provider: "qwen",
    speed: "slow",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Top-tier quality. Best for complex reasoning.",
    pricing: "Pay-per-use",
  },
  {
    id: "qwen3-coder-plus",
    name: "Qwen Coder Plus",
    provider: "qwen",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Specialized for code generation and debugging.",
    pricing: "Pay-per-use",
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "qwen",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "DeepSeek flagship. Excellent for math and reasoning.",
    pricing: "Pay-per-use",
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "qwen",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Fast DeepSeek. Good accuracy at low latency.",
    pricing: "Pay-per-use",
  },
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "qwen",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Lightweight DeepSeek. Ultra-fast responses.",
    pricing: "Pay-per-use",
  },
  {
    id: "glm-5.2",
    name: "GLM 5.2",
    provider: "qwen",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Zhipu AI. Strong reasoning, fast response.",
    pricing: "Pay-per-use",
  },
  {
    id: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    provider: "qwen",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Moonshot's coding model. Best for programming.",
    pricing: "Pay-per-use",
  },
  {
    id: "qwen-turbo",
    name: "Qwen Turbo",
    provider: "qwen",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Cheapest and fastest. Quick questions.",
    pricing: "Pay-per-use",
  },
  {
    id: "qwen3.6-35b-a3b",
    name: "Qwen 3.6 35B",
    provider: "qwen",
    speed: "medium",
    contextWindow: 262144,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "262K context. Great for long documents.",
    pricing: "Pay-per-use",
  },
  {
    id: "qwen3.5-397b-a17b",
    name: "Qwen 3.5 397B",
    provider: "qwen",
    speed: "slow",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Massive 397B model. Best for complex tasks.",
    pricing: "Pay-per-use",
  },
];

const DASHSCOPE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

export function createQwenProvider(): AIProvider | null {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) return null;

  return {
    id: "qwen",
    name: "Qwen Cloud",
    icon: "☁️",
    color: "#7C3AED",
    isAvailable: true,
    models: QWEN_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch(DASHSCOPE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
        throw new Error(`Qwen: ${res.status} - ${err}`);
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
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {}
          }
        }
      }
    },
  };
}
