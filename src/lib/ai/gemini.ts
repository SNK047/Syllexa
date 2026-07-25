const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
  error?: {
    message: string;
    code: number;
  };
}

export async function generateWithGemini(
  prompt: string,
  context?: string,
  model: string = "gemini-2.0-flash"
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_STUDIO_KEY not configured");

  const systemInstruction = context
    ? `You are an AI tutor helping university students. Answer based ONLY on the provided context. If the context doesn't contain enough information, say so honestly. Be concise and academic in tone.\n\nContext:\n${context}`
    : "You are an AI tutor helping university students. Be concise, accurate, and academic in tone. Use examples when helpful.";

  const messages: GeminiMessage[] = [
    { role: "user", parts: [{ text: `${systemInstruction}\n\nUser question: ${prompt}` }] },
  ];

  const response = await fetch(
    `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

export async function generateChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_STUDIO_KEY not configured");

  const systemMsg = context
    ? `You are an AI tutor. Answer questions about the uploaded notes. Base your answers ONLY on the provided context. Be concise and academic.\n\nContext:\n${context}`
    : "You are an AI tutor for university students. Be concise and academic.";

  const contents: GeminiMessage[] = [
    { role: "user", parts: [{ text: systemMsg }] },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    })),
  ];

  const response = await fetch(
    `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

export async function generateFlashcards(
  content: string,
  count: number = 10
): Promise<{ question: string; answer: string; difficulty: string }[]> {
  const prompt = `Generate ${count} flashcards from the following study material. Return as a JSON array with objects having "question", "answer", and "difficulty" (easy/medium/hard) fields. Return ONLY the JSON array, no other text.

Study material:
${content.slice(0, 8000)}`;

  const response = await generateWithGemini(prompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuiz(
  content: string,
  questionCount: number = 5
): Promise<{ question: string; options: string[]; correct: number; explanation: string }[]> {
  const prompt = `Generate ${questionCount} multiple choice quiz questions from the following study material. Return as a JSON array with objects having "question", "options" (array of 4 strings), "correct" (index 0-3), and "explanation" fields. Return ONLY the JSON array, no other text.

Study material:
${content.slice(0, 8000)}`;

  const response = await generateWithGemini(prompt);
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
  return generateWithGemini(prompt);
}

export async function generateKeywords(content: string): Promise<string[]> {
  const prompt = `Extract the key terms, concepts, and keywords from this study material. Return as a JSON array of strings. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await generateWithGemini(prompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}
