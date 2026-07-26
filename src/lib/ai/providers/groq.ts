import type { AIProvider, AIModel, ChatMessage } from "./types";

const GROQ_MODELS: AIModel[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 32768,
    supportsImages: false,
    supportsCode: true,
    description: "Lightning-fast inference on Groq's LPU. Best speed in class.",
    pricing: "Free (rate limited)",
  },
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B",
    provider: "groq",
    speed: "fast",
    contextWindow: 8192,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Compact Google model. Ultra-fast responses.",
    pricing: "Free (rate limited)",
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    provider: "groq",
    speed: "fast",
    contextWindow: 32768,
    maxOutput: 32768,
    supportsImages: false,
    supportsCode: true,
    description: "Mixture of Experts model. Great balance of speed and quality.",
    pricing: "Free (rate limited)",
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 (Llama)",
    provider: "groq",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 16384,
    supportsImages: false,
    supportsCode: true,
    description: "Distilled DeepSeek R1 reasoning model on Groq's fast infra.",
    pricing: "Free (rate limited)",
  },
];

export function createGroqProvider(): AIProvider | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  return {
    id: "groq",
    name: "GroqCloud",
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
        throw new Error(`Groq API error: ${res.status} - ${err}`);
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
