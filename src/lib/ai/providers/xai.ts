import type { AIProvider, AIModel, ChatMessage } from "./types";

const XAI_MODELS: AIModel[] = [
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "xai",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 16384,
    supportsImages: false,
    supportsCode: true,
    description: "xAI flagship. Best accuracy, reasoning, and real-world knowledge. Great for research.",
    pricing: "$3/$15 per 1M tokens",
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    provider: "xai",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 16384,
    supportsImages: false,
    supportsCode: true,
    description: "Fast Grok model. Good balance of speed and quality for general questions.",
    pricing: "$0.30/$0.50 per 1M tokens",
  },
  {
    id: "grok-2",
    name: "Grok 2",
    provider: "xai",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Previous-gen Grok. Still capable and cheaper than Grok 3.",
    pricing: "$2/$10 per 1M tokens",
  },
];

export function createXAIProvider(): AIProvider | null {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  return {
    id: "xai",
    name: "Grok (xAI)",
    icon: "X",
    color: "#1DA1F2",
    isAvailable: true,
    models: XAI_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch("https://api.x.ai/v1/chat/completions", {
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
        throw new Error(`xAI: ${res.status} - ${err}`);
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
