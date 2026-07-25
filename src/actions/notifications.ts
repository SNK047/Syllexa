"use server";

import { createClient } from "@/lib/supabase/server";

export async function getNotifications(limit: number = 20) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error: error?.message };
}

export async function getUnreadCount() {
  const supabase = await createClient();
  if (!supabase) return { data: 0, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: 0, error: "Not authenticated" };

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return { data: count || 0, error: error?.message };
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  return { error: error?.message };
}

export async function markAllAsRead() {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return { error: error?.message };
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  const supabase = await createClient();
  if (!supabase) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link,
    read: false,
  });
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  return { error: error?.message };
}
