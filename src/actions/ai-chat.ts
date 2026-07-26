"use server";

import { createClient } from "@/lib/supabase/server";
import { generateChatResponse, getContextForQuery } from "@/lib/ai";

export async function chatWithNote(
  noteId: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  try {
    const { data: note } = await supabase
      .from("notes")
      .select("content_text, title")
      .eq("id", noteId)
      .single();

    if (!note?.content_text || note.content_text.trim().length < 50) {
      return { error: "This note's text has not been extracted yet. Please re-upload the note to enable AI chat." };
    }

    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const context = lastUserMsg
      ? await getContextForQuery(lastUserMsg.content, note.content_text)
      : note.content_text.slice(0, 4000);

    const response = await generateChatResponse(messages, context);
    return { data: response };
  } catch (err: any) {
    console.error("AI chat error:", err);
    return { error: `AI error: ${err.message || "AI service error"}` };
  }
}

export async function chatGeneral(
  messages: { role: "user" | "assistant"; content: string }[]
) {
  try {
    const response = await generateChatResponse(messages);
    return { data: response };
  } catch (err: any) {
    console.error("AI chat error:", err);
    return { error: `AI error: ${err.message || "AI service error"}` };
  }
}
