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

export function simpleSearch(query: string, chunks: string[], topK: number = 5): SearchResult[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const scored = chunks.map((text, i) => {
    const lowerText = text.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const matches = (lowerText.match(new RegExp(term, "g")) || []).length;
      score += matches;
    }
    return { text, score, chunkIndex: i };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function getContextForQuery(
  query: string,
  noteContent: string
): Promise<string> {
  const chunks = chunkText(noteContent);
  if (chunks.length === 0) return noteContent;

  const results = simpleSearch(query, chunks, 5);
  const relevant = results.filter((r) => r.score > 0);

  if (relevant.length > 0) {
    return relevant.map((r) => r.text).join("\n\n---\n\n");
  }

  return chunks.slice(0, 3).join("\n\n---\n\n");
}
