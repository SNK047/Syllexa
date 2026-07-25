"use server";

import { createClient } from "@/lib/supabase/server";

export async function getRatings(noteId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("ratings")
    .select(`
      *,
      users:user_id (id, name, avatar)
    `)
    .eq("note_id", noteId)
    .order("created_at", { ascending: false });

  return { data, error: error?.message };
}

export async function addRating(noteId: string, score: number, review?: string) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "Not authenticated" };

  // Upsert rating
  const { data, error } = await supabase
    .from("ratings")
    .upsert(
      {
        note_id: noteId,
        user_id: user.id,
        score,
        review: review || null,
      },
      { onConflict: "note_id,user_id" }
    )
    .select()
    .single();

  if (!error) {
    // Update note average rating
    const { data: ratings } = await supabase
      .from("ratings")
      .select("score")
      .eq("note_id", noteId);

    if (ratings && ratings.length > 0) {
      const avg = ratings.reduce((sum: number, r: any) => sum + r.score, 0) / ratings.length;
      await supabase
        .from("notes")
        .update({ average_rating: Math.round(avg * 10) / 10 })
        .eq("id", noteId);
    }
  }

  return { data, error: error?.message };
}

export async function deleteRating(noteId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ratings")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", user.id);

  return { error: error?.message };
}
