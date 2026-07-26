import type { AIProvider } from "./types";

export function createHuggingFaceProvider(): AIProvider | null {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  return {
    id: "huggingface",
    name: "HuggingFace",
    icon: "🤗",
    color: "#FFD21E",
    isAvailable: false,
    models: [],

    async *chat() {
      throw new Error(
        "HuggingFace API is currently unreachable. Use OpenRouter or Groq instead."
      );
    },
  };
}
