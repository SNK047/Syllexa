const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

async function callLLM(
  prompt: string,
  systemPrompt: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: prompt },
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://syllexa.vercel.app",
      "X-Title": "Syllexa AI",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

export async function generateWithAI(
  prompt: string,
  context?: string,
  model?: string
): Promise<string> {
  const systemPrompt = context
    ? `You are an AI tutor helping university students. Answer based ONLY on the provided context. If the context doesn't contain enough information, say so honestly. Be concise and academic in tone.\n\nContext:\n${context}`
    : "You are an AI tutor helping university students. Be concise, accurate, and academic in tone. Use examples when helpful.";

  return callLLM(`${systemPrompt}\n\nUser question: ${prompt}`, "", model);
}

export async function generateChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const systemMsg = context
    ? `You are an AI tutor. Answer questions about the uploaded notes. Base your answers ONLY on the provided context. Be concise and academic.\n\nContext:\n${context}`
    : "You are an AI tutor for university students. Be concise and academic.";

  const apiMessages = [
    { role: "system" as const, content: systemMsg },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://syllexa.vercel.app",
      "X-Title": "Syllexa AI",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

export async function generateFlashcards(
  content: string,
  count: number = 10
): Promise<{ question: string; answer: string; difficulty: string }[]> {
  const prompt = `Generate ${count} flashcards from the following study material. Return as a JSON array with objects having "question", "answer", and "difficulty" (easy/medium/hard) fields. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callLLM(prompt, "You are a study assistant. Return only valid JSON.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuiz(
  content: string,
  questionCount: number = 5
): Promise<{ question: string; options: string[]; correct: number; explanation: string }[]> {
  const prompt = `Generate ${questionCount} multiple choice quiz questions from the following study material. Return as a JSON array with objects having "question", "options" (array of 4 strings), "correct" (index 0-3), and "explanation" fields. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callLLM(prompt, "You are a quiz generator. Return only valid JSON.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateSummary(
  content: string,
  style: "brief" | "detailed" | "exam" = "brief"
): Promise<string> {
  const styleMap = {
    brief: "Create a concise summary in 200-300 words covering the key points.",
    detailed: "Create a detailed summary covering all major concepts, formulas, and examples.",
    exam: "Create an exam-focused summary highlighting likely exam topics, important definitions, and key formulas.",
  };

  const prompt = `${styleMap[style]}\n\nStudy material:\n${content.slice(0, 8000)}`;
  return callLLM(prompt, "You are a study assistant. Create clear, well-structured summaries.");
}

export async function generateKeywords(content: string): Promise<string[]> {
  const prompt = `Extract the key terms, concepts, and keywords from this study material. Return as a JSON array of strings. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callLLM(prompt, "You are a keyword extractor. Return only valid JSON.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}
