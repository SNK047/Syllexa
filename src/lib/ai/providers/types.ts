export interface AIModel {
  id: string;
  name: string;
  provider: string;
  speed: "fast" | "medium" | "slow";
  contextWindow: number;
  maxOutput: number;
  supportsImages: boolean;
  supportsCode: boolean;
  description: string;
  pricing: string;
}

export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  isAvailable: boolean;
  models: AIModel[];
  chat(
    messages: ChatMessage[],
    model: string,
    options?: { temperature?: number; maxTokens?: number; systemPrompt?: string }
  ): AsyncGenerator<string, void, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
