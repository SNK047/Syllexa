import type { AIProvider } from "./types";
import { createOllamaProvider } from "./ollama";
import { createQwenProvider } from "./qwen";

let providers: AIProvider[] | null = null;

export function getProviders(): AIProvider[] {
  if (providers) return providers;
  providers = [createOllamaProvider(), createQwenProvider()].filter(Boolean) as AIProvider[];
  return providers;
}

export function getProvider(id: string): AIProvider | undefined {
  return getProviders().find((p) => p.id === id);
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
