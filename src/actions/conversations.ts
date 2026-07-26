"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface Conversation {
  id: string;
  note_id: string | null;
  messages: { role: string; content: string; provider?: string; model?: string }[];
  created_at: string;
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function getUserConversations(): Promise<Conversation[]> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []) as Conversation[];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return data as Conversation | null;
}

export async function saveConversation(
  id: string | null,
  messages: { role: string; content: string; provider?: string; model?: string }[],
  noteId?: string | null
): Promise<string | null> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (id) {
    await supabase
      .from("ai_conversations")
      .update({ messages, note_id: noteId || null })
      .eq("id", id)
      .eq("user_id", user.id);
    return id;
  } else {
    const { data } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, messages, note_id: noteId || null })
      .select("id")
      .single();
    return data?.id || null;
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
}
