"use server";

import { createClient } from "@/lib/supabase/server";
import { generateFlashcards, generateQuiz, generateSummary, generateKeywords } from "@/lib/ai";

async function getNoteContent(noteId: string): Promise<{ content: string | null; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { content: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("notes")
    .select("content_text")
    .eq("id", noteId)
    .single();

  if (error) return { content: null, error: "Note not found" };
  if (data?.content_text && data.content_text.trim().length > 50) {
    return { content: data.content_text };
  }

  return {
    content: null,
    error: "PDF text has not been extracted yet. Please re-upload this note to enable AI features.",
  };
}

export async function createFlashcards(noteId: string, count: number = 10) {
  const { content, error } = await getNoteContent(noteId);
  if (!content) return { data: [], error: error || "Note content not available" };

  try {
    const flashcards = await generateFlashcards(content, count);
    return { data: flashcards, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || "Failed to generate flashcards" };
  }
}

export async function createQuiz(noteId: string, questionCount: number = 5) {
  const { content, error } = await getNoteContent(noteId);
  if (!content) return { data: [], error: error || "Note content not available" };

  try {
    const quiz = await generateQuiz(content, questionCount);
    return { data: quiz, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || "Failed to generate quiz" };
  }
}

export async function createSummary(
  noteId: string,
  style: "brief" | "detailed" | "exam" = "brief"
) {
  const { content, error } = await getNoteContent(noteId);
  if (!content) return { data: null, error: error || "Note content not available" };

  try {
    const summary = await generateSummary(content, style);
    return { data: summary, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Failed to generate summary" };
  }
}

export async function extractKeywords(noteId: string) {
  const { content, error } = await getNoteContent(noteId);
  if (!content) return { data: [], error: error || "Note content not available" };

  try {
    const keywords = await generateKeywords(content);
    return { data: keywords, error: null };
  } catch (err: any) {
    return { data: [], error: err.message || "Failed to extract keywords" };
  }
}
