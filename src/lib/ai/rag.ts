import { generateWithGemini } from "./gemini";

export interface SearchResult {
  text: string;
  score: number;
  chunkIndex: number;
}

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }

  return chunks;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_STUDIO_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        })),
      }),
    }
  );

  const data = await response.json();
  return data.embeddings?.map((e: any) => e.values) || [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchChunks(
  query: string,
  chunks: string[],
  embeddings: number[][],
  topK: number = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await embedTexts([query]);
  if (!queryEmbedding.length) return [];

  const queryVec = queryEmbedding[0];
  const scored = chunks.map((text, i) => ({
    text,
    score: cosineSimilarity(queryVec, embeddings[i] || []),
    chunkIndex: i,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function getContextForQuery(
  query: string,
  noteContent: string
): Promise<string> {
  const chunks = chunkText(noteContent);
  if (chunks.length === 0) return noteContent;

  try {
    const embeddings = await embedTexts(chunks);
    const results = await searchChunks(query, chunks, embeddings, 5);
    return results.map((r) => r.text).join("\n\n---\n\n");
  } catch {
    // Fallback: return first few chunks
    return chunks.slice(0, 3).join("\n\n---\n\n");
  }
}
