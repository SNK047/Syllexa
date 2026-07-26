import type { AIProvider, AIModel, ChatMessage } from "./types";

const TOGETHER_MODELS: AIModel[] = [
  {
    id: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek V3",
    provider: "together",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "DeepSeek's flagship. Excellent at code and reasoning.",
    pricing: "Free credits on signup",
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    name: "Llama 3.3 70B Turbo",
    provider: "together",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Optimized Llama for speed. Great general performance.",
    pricing: "Free credits on signup",
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
    name: "Qwen 3 235B Thinking",
    provider: "together",
    speed: "slow",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Qwen with extended thinking. Best for complex problems.",
    pricing: "Free credits on signup",
  },
  {
    id: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
    name: "Mistral Small 3.1",
    provider: "together",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Fast Mistral with vision. Versatile and efficient.",
    pricing: "Free credits on signup",
  },
  {
    id: "google/Gemma-3-27B-IT",
    name: "Gemma 3 27B",
    provider: "together",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Google's open model. Vision capable.",
    pricing: "Free credits on signup",
  },
];

export function createTogetherProvider(): AIProvider | null {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;

  return {
    id: "together",
    name: "Together AI",
    icon: "🔗",
    color: "#0EA5E9",
    isAvailable: true,
    models: TOGETHER_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch("https://api.together.xyz/v1/chat/completions", {
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
        throw new Error(`Together API error: ${res.status} - ${err}`);
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
