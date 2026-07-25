"use server";

import { createClient } from "@/lib/supabase/server";

export async function getComments(noteId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("comments")
    .select(`
      *,
      users:user_id (id, name, avatar)
    `)
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  return { data, error: error?.message };
}

export async function addComment(noteId: string, content: string, parentId?: string) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      note_id: noteId,
      user_id: user.id,
      content,
      parent_id: parentId || null,
    })
    .select(`
      *,
      users:user_id (id, name, avatar)
    `)
    .single();

  return { data, error: error?.message };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  return { error: error?.message };
}
