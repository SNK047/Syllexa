import type { AIProvider, AIModel, ChatMessage } from "./types";

const DEEPSEEK_MODELS: AIModel[] = [
  {
    id: "deepseek-v4-flash",
    name: "V4 Flash",
    provider: "deepseek",
    speed: "fast",
    contextWindow: 1048576,
    maxOutput: 384000,
    supportsImages: false,
    supportsCode: true,
    description: "Fastest DeepSeek model. Excellent for quick questions, code, and general use. $0.14/M input — cheapest frontier-class model.",
    pricing: "$0.14/$0.28 per 1M tokens",
  },
  {
    id: "deepseek-v4-pro",
    name: "V4 Pro",
    provider: "deepseek",
    speed: "medium",
    contextWindow: 1048576,
    maxOutput: 384000,
    supportsImages: false,
    supportsCode: true,
    description: "DeepSeek flagship. Best accuracy for complex reasoning, research, and difficult problems. $0.44/M input.",
    pricing: "$0.44/$0.87 per 1M tokens",
  },
];

export function createDeepSeekProvider(): AIProvider | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  return {
    id: "deepseek",
    name: "DeepSeek",
    icon: "DS",
    color: "#4F6BF6",
    isAvailable: true,
    models: DEEPSEEK_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
        throw new Error(`DeepSeek: ${res.status} - ${err}`);
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
