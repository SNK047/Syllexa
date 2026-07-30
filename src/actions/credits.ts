"use server";

import { createClient } from "@/lib/supabase/server";

const CREDIT_RULES = {
  UPLOAD_NOTE: 5,
  FULFILL_REQUEST: 20,
  DAILY_LOGIN: 5,
  RECEIVE_RATING: 5,
  CREATE_REQUEST: -10,
  PRIORITY_REQUEST: -15,
  UNLIMITED_AI_MONTHLY: -50,
} as const;

export async function getCredits(userId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: 0, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  return { data: data?.credits || 0, error: error?.message };
}

export async function addCredits(amount: number, type: string, reason: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get current credits
  const { data: userData } = await supabase
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  const currentCredits = userData?.credits || 0;
  const newCredits = currentCredits + amount;

  // Update credits
  const { error: updateError } = await supabase
    .from("users")
    .update({ credits: newCredits })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  // Log the transaction
  await supabase.from("credits_log").insert({
    user_id: user.id,
    amount,
    type,
    reason,
  });

  return { data: newCredits, error: null };
}

export async function getCreditHistory(userId: string, limit: number = 20) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("credits_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error: error?.message };
}

export async function getLeaderboard(period: "weekly" | "monthly" | "all" = "all") {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  if (period === "all") {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, avatar, credits, streak")
      .order("credits", { ascending: false })
      .limit(50);
    return { data, error: error?.message };
  }

  const days = period === "weekly" ? 7 : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await supabase
    .from("credits_log")
    .select("user_id, amount, users:user_id (id, name, avatar, credits, streak)")
    .gte("created_at", since);

  if (error) return { data: [], error: error.message };

  const periodCredits = new Map<string, number>();
  const userMap = new Map<string, any>();

  for (const entry of data || []) {
    const uid = entry.user_id;
    periodCredits.set(uid, (periodCredits.get(uid) || 0) + (entry.amount > 0 ? entry.amount : 0));
    if (entry.users) userMap.set(uid, entry.users);
  }

  const ranked = Array.from(periodCredits.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, credits]) => ({
      ...userMap.get(id) || { id, name: "Unknown", avatar: null, credits: 0, streak: 0 },
      credits,
    }))
    .slice(0, 50);

  return { data: ranked, error: null };
}

export { CREDIT_RULES };
