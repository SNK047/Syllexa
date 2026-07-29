"use server";

import { createClient } from "@/lib/supabase/server";

export async function getBookmarks() {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bookmarks")
    .select(`
      id,
      created_at,
      notes:note_id (
        *,
        users:user_id (id, name, avatar),
        subjects:subject_id (id, name, code),
        units:unit_id (id, number, title)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { data, error: error?.message };
}

export async function addBookmark(noteId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, note_id: noteId });

  return { error: error?.message };
}

export async function removeBookmark(noteId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("note_id", noteId);

  return { error: error?.message };
}

export async function isBookmarked(noteId: string) {
  const supabase = await createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("note_id", noteId)
    .maybeSingle();

  return !!data;
}
