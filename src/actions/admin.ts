"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAdminStats() {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const [usersCount, notesCount, requestsCount, downloadsResult] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("notes").select("*", { count: "exact", head: true }),
    supabase.from("requests").select("*", { count: "exact", head: true }),
    supabase.from("notes").select("downloads"),
  ]);

  const totalDownloads = (downloadsResult.data || []).reduce(
    (sum: number, n: any) => sum + (n.downloads || 0),
    0
  );

  return {
    data: {
      totalUsers: usersCount.count || 0,
      totalNotes: notesCount.count || 0,
      totalRequests: requestsCount.count || 0,
      totalDownloads,
    },
    error: null,
  };
}

export async function getAllUsers(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  if (!supabase) return { data: [], count: 0, error: "Supabase not configured" };

  const offset = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, count, error: error?.message };
}

export async function toggleUserBan(userId: string, banned: boolean) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase
    .from("users")
    .update({ banned })
    .eq("id", userId);

  return { error: error?.message };
}

export async function getAllNotesAdmin(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  if (!supabase) return { data: [], count: 0, error: "Supabase not configured" };

  const offset = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from("notes")
    .select(`
      *,
      users:user_id (id, name, email),
      subjects:subject_id (name, code),
      units:unit_id (number, title)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, count, error: error?.message };
}

export async function deleteNoteAdmin(noteId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  return { error: error?.message };
}
