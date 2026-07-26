const OLLAMA_API_URL = "https://ollama.com/v1/chat/completions";

const STUDY_SYSTEM_PROMPT = `You are Syllexa AI, an intelligent university study assistant for Indian engineering students.

CORE RULES:
- Always provide ACCURATE, FACTUALLY CORRECT information. Never guess or make up facts.
- If you are unsure, say "I'm not certain — please verify with your textbook."
- For code: provide complete, runnable code with comments explaining each part.
- For math: show the full derivation step by step.
- For definitions: give a precise 1-2 line definition, then explain in simple terms.
- Use markdown formatting: headers, bold, bullet points, code blocks.
- Relate concepts to real-world applications when possible.

SUBJECTS: Data Structures, Algorithms, OS, DBMS, Computer Networks, C/C++/Java/Python, Digital Electronics, Signals, Math, Thermodynamics, Circuit Analysis.

Be helpful, encouraging, and educational — help students understand, not just memorize.`;

async function callOllama(
  prompt: string,
  systemPrompt: string,
  model: string = "gpt-oss:20b"
): Promise<string> {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error("OLLAMA_API_KEY not configured");

  const messages = [
    { role: "system" as const, content: systemPrompt || STUDY_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  const response = await fetch(OLLAMA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama API: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

export async function generateChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: string,
  model?: string
): Promise<string> {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error("OLLAMA_API_KEY not configured");

  const systemMsg = context
    ? `You are an AI tutor. Answer questions about uploaded notes. Base answers ONLY on the provided context. Be precise and academic.\n\nContext:\n${context}`
    : STUDY_SYSTEM_PROMPT;

  const apiMessages = [
    { role: "system" as const, content: systemMsg },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const response = await fetch(OLLAMA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-oss:20b",
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama API: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

export async function generateFlashcards(
  content: string,
  count: number = 10
): Promise<{ question: string; answer: string; difficulty: string }[]> {
  const prompt = `Generate ${count} flashcards from the following study material. Each should test understanding. Return as JSON array with "question", "answer", "difficulty" (easy/medium/hard). Return ONLY the JSON array.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callOllama(prompt, "Return only valid JSON. Make questions specific and answers precise.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuiz(
  content: string,
  questionCount: number = 5
): Promise<{ question: string; options: string[]; correct: number; explanation: string }[]> {
  const prompt = `Generate ${questionCount} MCQ questions from the following study material. Return as JSON array with "question", "options" (4 strings), "correct" (index 0-3), "explanation". Return ONLY the JSON array.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callOllama(prompt, "Return only valid JSON. Distractors should be plausible.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateSummary(
  content: string,
  style: "brief" | "detailed" | "exam" = "brief"
): Promise<string> {
  const styleMap = {
    brief: "Create a concise summary in 200-300 words covering key points.",
    detailed: "Create a detailed summary covering all major concepts, formulas, and examples.",
    exam: "Create an exam-focused summary highlighting likely exam topics, important definitions, and key formulas.",
  };

  const prompt = `${styleMap[style]}\n\nStudy material:\n${content.slice(0, 8000)}`;
  return callOllama(prompt, "Be accurate and well-structured. Do not fabricate information.");
}

export async function generateKeywords(content: string): Promise<string[]> {
  const prompt = `Extract key terms, concepts, and keywords from this study material. Return as JSON array of strings. Return ONLY the JSON array.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callOllama(prompt, "Return only valid JSON array.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function getContextForQuery(
  query: string,
  noteContent: string
): Promise<string> {
  const chunks: string[] = [];
  let start = 0;
  while (start < noteContent.length) {
    const end = Math.min(start + 1000, noteContent.length);
    chunks.push(noteContent.slice(start, end));
    start = end - 200;
    if (start + 200 >= noteContent.length) break;
  }
  if (chunks.length === 0) return noteContent;

  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const scored = chunks.map((text, i) => {
    let score = 0;
    for (const term of queryTerms) {
      const matches = (text.toLowerCase().match(new RegExp(term, "g")) || []).length;
      score += matches;
    }
    return { text, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const relevant = scored.filter((r) => r.score > 0);
  return relevant.length > 0
    ? relevant.map((r) => r.text).join("\n\n---\n\n")
    : chunks.slice(0, 3).join("\n\n---\n\n");
}
