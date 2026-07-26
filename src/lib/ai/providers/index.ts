import type { AIProvider } from "./types";
import { createGeminiProvider } from "./gemini";
import { createOpenRouterProvider } from "./openrouter";
import { createGroqProvider } from "./groq";
import { createHuggingFaceProvider } from "./huggingface";
import { createTogetherProvider } from "./together";

let providers: AIProvider[] | null = null;

export function getProviders(): AIProvider[] {
  if (providers) return providers;

  providers = [
    createGeminiProvider(),
    createOpenRouterProvider(),
    createGroqProvider(),
    createHuggingFaceProvider(),
    createTogetherProvider(),
  ].filter(Boolean) as AIProvider[];

  return providers;
}

export function getProvider(id: string): AIProvider | undefined {
  return getProviders().find((p) => p.id === id);
}

export function getAvailableProviderIds(): string[] {
  return getProviders().map((p) => p.id);
}

export function getAllModels() {
  return getProviders().flatMap((p) =>
    p.models.map((m) => ({
      ...m,
      providerName: p.name,
      providerColor: p.color,
      providerIcon: p.icon,
    }))
  );
}

export type { AIProvider, AIModel, ChatMessage } from "./types";
