"use server";

import { createClient } from "@/lib/supabase/server";
import { generateFlashcards, generateQuiz, generateSummary, generateKeywords } from "@/lib/ai";

async function getNoteContent(noteId: string): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("notes")
    .select("content_text")
    .eq("id", noteId)
    .single();

  return data?.content_text || null;
}

export async function createFlashcards(noteId: string, count: number = 10) {
  const content = await getNoteContent(noteId);
  if (!content) return { data: [], error: "Note content not available" };

  try {
    const flashcards = await generateFlashcards(content, count);
    return { data: flashcards, error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function createQuiz(noteId: string, questionCount: number = 5) {
  const content = await getNoteContent(noteId);
  if (!content) return { data: [], error: "Note content not available" };

  try {
    const quiz = await generateQuiz(content, questionCount);
    return { data: quiz, error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function createSummary(
  noteId: string,
  style: "brief" | "detailed" | "exam" = "brief"
) {
  const content = await getNoteContent(noteId);
  if (!content) return { data: null, error: "Note content not available" };

  try {
    const summary = await generateSummary(content, style);
    return { data: summary, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function extractKeywords(noteId: string) {
  const content = await getNoteContent(noteId);
  if (!content) return { data: [], error: "Note content not available" };

  try {
    const keywords = await generateKeywords(content);
    return { data: keywords, error: null };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}
