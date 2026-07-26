const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";

const STUDY_SYSTEM_PROMPT = `You are Syllexa AI, an intelligent university study assistant for Indian engineering students.

CORE RULES:
- Always provide ACCURATE, FACTUALLY CORRECT information. Never guess or make up facts.
- If you are unsure, say "I'm not certain — please verify with your textbook."
- Use your training knowledge to answer. Do NOT claim to look things up.
- For code: provide complete, runnable code with comments.
- For math: show full derivations step by step.
- For definitions: precise 1-2 line definition, then explain simply.
- Use markdown formatting: headers, bold, bullet points, code blocks.
- Relate concepts to real-world applications when possible.

SUBJECTS: Data Structures, Algorithms, OS, DBMS, Computer Networks, C/C++/Java/Python, Digital Electronics, Signals, Math, Thermodynamics, Circuit Analysis.

Be helpful, encouraging, and educational — help students understand, not just memorize.`;

async function callLLM(
  prompt: string,
  systemPrompt: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const messages = [
    { role: "system" as const, content: systemPrompt || STUDY_SYSTEM_PROMPT },
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
    ? `You are an AI tutor for university students. Answer based ONLY on the provided context. If the context doesn't contain enough info, say so honestly. Be precise, concise, and academic.\n\nContext:\n${context}`
    : STUDY_SYSTEM_PROMPT;

  return callLLM(prompt, systemPrompt, model);
}

export async function generateChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const systemMsg = context
    ? `You are an AI tutor. Answer questions about the uploaded notes. Base answers ONLY on the provided context. Be precise, concise, and academic. If the context doesn't cover the question, say so.\n\nContext:\n${context}`
    : STUDY_SYSTEM_PROMPT;

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
  const prompt = `Generate ${count} flashcards from the following study material. Each flashcard should test understanding, not just recall. Return as a JSON array with objects having "question", "answer", and "difficulty" (easy/medium/hard) fields. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callLLM(prompt, "You are a study assistant creating flashcards. Return only valid JSON. Make questions specific and answers precise.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuiz(
  content: string,
  questionCount: number = 5
): Promise<{ question: string; options: string[]; correct: number; explanation: string }[]> {
  const prompt = `Generate ${questionCount} multiple choice quiz questions from the following study material. Make questions test understanding, not just memorization. Return as a JSON array with objects having "question", "options" (array of 4 strings — one correct, three plausible distractors), "correct" (index 0-3), and "explanation" fields. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callLLM(prompt, "You are a quiz generator for university students. Return only valid JSON. Distractors should be plausible but clearly wrong to someone who understands the material.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateSummary(
  content: string,
  style: "brief" | "detailed" | "exam" = "brief"
): Promise<string> {
  const styleMap = {
    brief: "Create a concise summary in 200-300 words. Cover key concepts, definitions, and formulas. Use bullet points for readability.",
    detailed: "Create a detailed summary covering ALL major concepts, formulas, theorems, and examples. Organize by topic with clear headers.",
    exam: "Create an exam-focused summary: highlight likely exam topics, important definitions and their precise wording, key formulas with variable meanings, common problem types and solution approaches.",
  };

  const prompt = `${styleMap[style]}\n\nStudy material:\n${content.slice(0, 8000)}`;
  return callLLM(prompt, "You are a study assistant creating summaries. Be accurate and well-structured. Do not fabricate information not present in the source material.");
}

export async function generateKeywords(content: string): Promise<string[]> {
  const prompt = `Extract key terms, concepts, formulas, and keywords from this study material. Include both the term and a brief (5-word) definition for each. Return as a JSON array of strings in format "Term: Brief definition". Return ONLY the JSON array.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callLLM(prompt, "You are a keyword extractor. Return only valid JSON array. Include technical terms, not generic words.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}
