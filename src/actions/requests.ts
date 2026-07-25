"use server";

import { createClient } from "@/lib/supabase/server";

export async function getRequests(filters?: {
  subjectId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  let query = supabase
    .from("requests")
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
  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.eq("status", "open");
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  return { data, error: error?.message };
}

export async function getAllRequests(limit: number = 50) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      users:user_id (id, name, avatar),
      subjects:subject_id (id, name, code),
      units:unit_id (id, number, title),
      fulfiller:fulfilled_by (id, name)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error: error?.message };
}

export async function getRequest(requestId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      users:user_id (id, name, avatar),
      subjects:subject_id (id, name, code),
      units:unit_id (id, number, title),
      fulfiller:fulfilled_by (id, name)
    `)
    .eq("id", requestId)
    .single();

  return { data, error: error?.message };
}

export async function createRequest(request: {
  subject_id: string;
  unit_id: string;
  description: string;
  urgency?: string;
  reward_credits?: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("requests")
    .insert({
      user_id: user.id,
      subject_id: request.subject_id,
      unit_id: request.unit_id,
      description: request.description,
      urgency: request.urgency || "normal",
      reward_credits: request.reward_credits || 10,
      status: "open",
    })
    .select()
    .single();

  return { data, error: error?.message };
}

export async function updateRequest(
  requestId: string,
  updates: { description?: string; urgency?: string; reward_credits?: number }
) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("requests")
    .update(updates)
    .eq("id", requestId)
    .eq("user_id", user.id)
    .eq("status", "open");

  return { error: error?.message };
}

export async function fulfillRequest(requestId: string, noteId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("requests")
    .update({
      status: "fulfilled",
      fulfilled_by: user.id,
      note_id: noteId,
    })
    .eq("id", requestId)
    .eq("status", "open");

  if (error) return { error: error.message };

  // Award credits to fulfiller
  const { data: fulfillerCredits } = await supabase
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (fulfillerCredits) {
    const { addCredits } = await import("@/actions/credits");
    await addCredits(20, "fulfill_request", "Fulfilled a note request");
  }

  return { error: null };
}

export async function deleteRequest(id: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("requests")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return { error: error?.message };
}

export async function getRequestsByUser(userId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      subjects:subject_id (id, name, code),
      units:unit_id (id, number, title)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data, error: error?.message };
}
