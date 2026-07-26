import type { AIProvider, AIModel, ChatMessage } from "./types";

const GROQ_MODELS: AIModel[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "groq",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 65536,
    supportsImages: false,
    supportsCode: true,
    description: "OpenAI's 120B open-weight model. Best Groq model for accuracy and reasoning.",
    pricing: "Paid",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 32768,
    supportsImages: false,
    supportsCode: true,
    description: "Meta's Llama 3.3. General purpose, multilingual. Reliable all-rounder.",
    pricing: "Paid",
  },
  {
    id: "qwen/qwen3.6-27b",
    name: "Qwen 3.6 27B",
    provider: "groq",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 16384,
    supportsImages: false,
    supportsCode: true,
    description: "Alibaba's Qwen 3.6. Strong for math, code, and multilingual tasks.",
    pricing: "Paid",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "groq",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 65536,
    supportsImages: false,
    supportsCode: true,
    description: "OpenAI's smaller open-weight model. Fast with good accuracy.",
    pricing: "Paid",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    provider: "groq",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 131072,
    supportsImages: false,
    supportsCode: true,
    description: "Lightweight Llama. Very fast for quick questions.",
    pricing: "Paid",
  },
];

export function createGroqProvider(): AIProvider | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  return {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    color: "#F55036",
    isAvailable: true,
    models: GROQ_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        throw new Error(`Groq: ${res.status} - ${err}`);
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
