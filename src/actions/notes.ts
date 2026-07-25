"use server";

import { createClient } from "@/lib/supabase/server";

export async function getNotes(filters?: {
  subjectId?: string;
  unitId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  let query = supabase
    .from("notes")
    .select(`
      *,
      users:user_id (id, name, avatar),
      subjects:subject_id (id, name, code),
      units:unit_id (id, number, title)
    `)
    .order("created_at", { ascending: false });

  if (filters?.subjectId) {
    query = query.eq("subject_id", filters.subjectId);
  }
  if (filters?.unitId) {
    query = query.eq("unit_id", filters.unitId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.eq("status", "PUBLISHED");
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  return { data, error: error?.message };
}

export async function getNote(id: string) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("notes")
    .select(`
      *,
      users:user_id (id, name, avatar),
      subjects:subject_id (id, name, code),
      units:unit_id (id, number, title)
    `)
    .eq("id", id)
    .single();

  return { data, error: error?.message };
}

export async function createNote(note: {
  title: string;
  description?: string;
  subject_id: string;
  unit_id: string;
  file_url: string;
  file_size?: number;
  content_text?: string;
}) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: note.title,
      description: note.description,
      user_id: user.id,
      subject_id: note.subject_id,
      unit_id: note.unit_id,
      file_url: note.file_url,
      file_size: note.file_size,
      content_text: note.content_text,
      status: "PUBLISHED",
    })
    .select()
    .single();

  return { data, error: error?.message };
}

export async function deleteNote(id: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message };
}

export async function getNotesByUser(userId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("notes")
    .select(`
      *,
      subjects:subject_id (id, name, code),
      units:unit_id (id, number, title)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data, error: error?.message };
}

export async function searchNotes(query: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("notes")
    .select(`
      *,
      users:user_id (id, name, avatar),
      subjects:subject_id (id, name, code),
      units:unit_id (id, number, title)
    `)
    .eq("status", "PUBLISHED")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  return { data, error: error?.message };
}
