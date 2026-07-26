import type { AIProvider, AIModel, ChatMessage } from "./types";

const HF_MODELS: AIModel[] = [
  {
    id: "Qwen/Qwen3-235B-A22B",
    name: "Qwen 3 235B",
    provider: "huggingface",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Alibaba's flagship MoE model. Excellent multilingual and coding.",
    pricing: "Free (rate limited)",
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    name: "Llama 3.3 70B",
    provider: "huggingface",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Meta's latest open Llama. Strong general performance.",
    pricing: "Free (rate limited)",
  },
  {
    id: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
    name: "Mistral Small 3.1",
    provider: "huggingface",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Mistral's latest. Vision capable, great for coding.",
    pricing: "Free (rate limited)",
  },
  {
    id: "microsoft/Phi-4-reasoning-plus",
    name: "Phi-4 Reasoning+",
    provider: "huggingface",
    speed: "medium",
    contextWindow: 32768,
    maxOutput: 16384,
    supportsImages: false,
    supportsCode: true,
    description: "Microsoft's reasoning specialist. Math & code powerhouse.",
    pricing: "Free (rate limited)",
  },
  {
    id: "google/Gemma-3-27B-IT",
    name: "Gemma 3 27B",
    provider: "huggingface",
    speed: "medium",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: true,
    supportsCode: true,
    description: "Google's open model with vision support.",
    pricing: "Free (rate limited)",
  },
];

export function createHuggingFaceProvider(): AIProvider | null {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  return {
    id: "huggingface",
    name: "Hugging Face",
    icon: "🤗",
    color: "#FFD21E",
    isAvailable: true,
    models: HF_MODELS,

    async *chat(messages: ChatMessage[], model: string, options = {}) {
      const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

      const apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: "system", content: systemPrompt });
      }
      for (const m of messages) {
        apiMessages.push({ role: m.role, content: m.content });
      }

      const res = await fetch(
        `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HuggingFace API error: ${res.status} - ${err}`);
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
