import type { AIProvider, AIModel, ChatMessage } from "./types";

const TOGETHER_MODELS: AIModel[] = [
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    name: "Llama 3.3 70B Turbo",
    provider: "together",
    speed: "fast",
    contextWindow: 131072,
    maxOutput: 8192,
    supportsImages: false,
    supportsCode: true,
    description: "Meta's Llama. General purpose. Requires valid API key.",
    pricing: "Paid",
  },
];

export function createTogetherProvider(): AIProvider | null {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;

  return {
    id: "together",
    name: "Together",
    icon: "Together",
    color: "#00C896",
    isAvailable: false,
    models: TOGETHER_MODELS,

    async *chat(_messages: ChatMessage[], _model: string) {
      throw new Error(
        "Together AI: API key is invalid. Please update TOGETHER_API_KEY in Vercel settings."
      );
    },
  };
}
