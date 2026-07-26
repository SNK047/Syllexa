const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

const STUDY_SYSTEM_PROMPT = `You are Syllexa AI, an intelligent university study assistant for Indian engineering students.

CORE RULES:
- Always provide ACCURATE, FACTUALLY CORRECT information. Never guess or make up facts.
- If you are unsure, say "I'm not certain — please verify with your textbook."
- Use your training knowledge to answer. Do NOT claim to look things up or access the internet.
- For code: provide complete, runnable code with comments explaining each part.
- For math: show the full derivation step by step.
- For definitions: give a precise 1-2 line definition, then explain in simple terms.
- Use markdown formatting: headers, bold, bullet points, code blocks, LaTeX for math.
- Relate concepts to real-world applications when possible.
- If the question is about a specific Indian university syllabus, provide content relevant to Anna University / VTU / JNTU / Mumbai University patterns.

SUBJECTS YOU EXCEL AT:
- Computer Science: Data Structures, Algorithms, OS, DBMS, Computer Networks, Compiler Design, Theory of Computation, Software Engineering
- Programming: C, C++, Java, Python, JavaScript, SQL, HTML/CSS
- Electronics: Digital Electronics, Signals & Systems, VLSI, Communication Systems
- Math: Linear Algebra, Calculus, Probability, Statistics, Discrete Math
- Core Engineering: Thermodynamics, Fluid Mechanics, Circuit Analysis

Be helpful, encouraging, and educational. Students are here to learn — help them understand, not just memorize.`;

export async function callDeepSeek(
  prompt: string,
  systemPrompt: string,
  model: "deepseek-v4-flash" | "deepseek-v4-pro" = "deepseek-v4-flash"
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const messages = [
    { role: "system" as const, content: systemPrompt || STUDY_SYSTEM_PROMPT },
    { role: "user" as const, content: prompt },
  ];

  const response = await fetch(DEEPSEEK_API_URL, {
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
    throw new Error(`DeepSeek API: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

export async function callDeepSeekStream(
  messages: { role: "user" | "assistant"; content: string }[],
  model: "deepseek-v4-flash" | "deepseek-v4-pro" = "deepseek-v4-flash",
  options: { temperature?: number; maxTokens?: number; systemPrompt?: string } = {}
): Promise<ReadableStream<string>> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const { temperature = 0.7, maxTokens = 4096, systemPrompt } = options;

  const apiMessages = [];
  if (systemPrompt) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }
  for (const m of messages) {
    apiMessages.push({ role: m.role, content: m.content });
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API: ${response.status} - ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      try {
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
                if (text) controller.enqueue(text);
              } catch {}
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export async function generateWithAI(
  prompt: string,
  context?: string,
  model?: "deepseek-v4-flash" | "deepseek-v4-pro"
): Promise<string> {
  const systemPrompt = context
    ? `You are an AI tutor for university students. Answer based ONLY on the provided context. If the context doesn't contain enough info, say so honestly. Be precise, concise, and academic.\n\nContext:\n${context}`
    : STUDY_SYSTEM_PROMPT;

  return callDeepSeek(prompt, systemPrompt, model);
}

export async function generateChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: string,
  model?: "deepseek-v4-flash" | "deepseek-v4-pro"
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

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

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "deepseek-v4-flash",
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response generated.";
}

export async function generateFlashcards(
  content: string,
  count: number = 10
): Promise<{ question: string; answer: string; difficulty: string }[]> {
  const prompt = `Generate ${count} flashcards from the following study material. Each flashcard should test understanding, not just recall. Return as a JSON array with objects having "question", "answer", and "difficulty" (easy/medium/hard) fields. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callDeepSeek(prompt, "You are a study assistant creating flashcards. Return only valid JSON. Make questions specific and answers precise.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuiz(
  content: string,
  questionCount: number = 5
): Promise<{ question: string; options: string[]; correct: number; explanation: string }[]> {
  const prompt = `Generate ${questionCount} multiple choice quiz questions from the following study material. Make questions test understanding, not just memorization. Return as a JSON array with objects having "question", "options" (array of 4 strings — one correct, three plausible distractors), "correct" (index 0-3), and "explanation" fields. Return ONLY the JSON array, no other text.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callDeepSeek(prompt, "You are a quiz generator for university students. Return only valid JSON. Distractors should be plausible but clearly wrong to someone who understands the material.");
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
  return callDeepSeek(prompt, "You are a study assistant creating summaries. Be accurate and well-structured. Do not fabricate information not present in the source material.");
}

export async function generateKeywords(content: string): Promise<string[]> {
  const prompt = `Extract key terms, concepts, formulas, and keywords from this study material. Include both the term and a brief (5-word) definition for each. Return as a JSON array of strings in format "Term: Brief definition". Return ONLY the JSON array.\n\nStudy material:\n${content.slice(0, 8000)}`;

  const response = await callDeepSeek(prompt, "You are a keyword extractor. Return only valid JSON array. Include technical terms, not generic words.");
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}
