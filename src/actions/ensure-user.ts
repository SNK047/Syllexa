"use server";

import { createClient } from "@/lib/supabase/server";

export async function ensureUser() {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check if user row exists
  const { data: existing } = await supabase
    .from("users")
    .select("id, name, email, credits, streak, avatar, role, banned")
    .eq("id", user.id)
    .single();

  if (existing) return existing;

  // Create user row from auth data
  const name =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      id: user.id,
      email: user.email || "",
      name,
      avatar,
      credits: 100,
      streak: 0,
    })
    .select("id, name, email, credits, streak, avatar, role, banned")
    .single();

  if (error) {
    // If insert failed (maybe race condition), try fetching again
    const { data: retry } = await supabase
      .from("users")
      .select("id, name, email, credits, streak, avatar, role, banned")
      .eq("id", user.id)
      .single();
    return retry;
  }

  return newUser;
}
