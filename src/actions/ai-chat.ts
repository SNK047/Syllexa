"use server";

import { createClient } from "@/lib/supabase/server";
import { generateChatResponse, getContextForQuery } from "@/lib/ai";

export async function chatWithNote(
  noteId: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  // Get note content
  const { data: note } = await supabase
    .from("notes")
    .select("content_text, title")
    .eq("id", noteId)
    .single();

  if (!note?.content_text) {
    return { error: "Note content not available for chat" };
  }

  try {
    // Get relevant context using RAG
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const context = lastUserMsg
      ? await getContextForQuery(lastUserMsg.content, note.content_text)
      : note.content_text.slice(0, 4000);

    // Generate response
    const response = await generateChatResponse(messages, context);
    return { data: response };
  } catch (err: any) {
    return { error: err.message || "AI service error" };
  }
}

export async function chatGeneral(
  messages: { role: "user" | "assistant"; content: string }[]
) {
  try {
    const response = await generateChatResponse(messages);
    return { data: response };
  } catch (err: any) {
    return { error: err.message || "AI service error" };
  }
}

export async function saveConversation(noteId: string, messages: any[]) {
  const supabase = await createClient();
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("ai_conversations").insert({
    user_id: user.id,
    note_id: noteId,
    messages,
  });
}
