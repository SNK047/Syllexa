"use server";

import { createClient } from "@/lib/supabase/server";

const REQUEST_SELECT = `
  *,
  users:user_id (id, name, avatar),
  subjects:subject_id (id, name, code),
  units:unit_id (id, number, title)
`;

export async function getAllRequests(limit: number = 50) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };

  const requests = data || [];

  const fulfillerIds = [...new Set(requests.filter((r: any) => r.fulfilled_by).map((r: any) => r.fulfilled_by))];
  if (fulfillerIds.length > 0) {
    const { data: fulfillers } = await supabase
      .from("users")
      .select("id, name")
      .in("id", fulfillerIds);
    const fulfillerMap = new Map((fulfillers || []).map((f: any) => [f.id, f]));
    requests.forEach((r: any) => {
      if (r.fulfilled_by) r.fulfiller = fulfillerMap.get(r.fulfilled_by) || null;
    });
  }

  return { data: requests, error: null };
}

export async function getFilteredRequests(filters: {
  search?: string;
  status?: string;
  urgency?: string;
  subjectId?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  let query = supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(filters.limit || 50);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.urgency && filters.urgency !== "all") {
    query = query.eq("urgency", filters.urgency);
  }
  if (filters.subjectId) {
    query = query.eq("subject_id", filters.subjectId);
  }
  if (filters.search) {
    query = query.ilike("description", `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };

  const requests = data || [];

  const fulfillerIds = [...new Set(requests.filter((r: any) => r.fulfilled_by).map((r: any) => r.fulfilled_by))];
  if (fulfillerIds.length > 0) {
    const { data: fulfillers } = await supabase
      .from("users")
      .select("id, name")
      .in("id", fulfillerIds);
    const fulfillerMap = new Map((fulfillers || []).map((f: any) => [f.id, f]));
    requests.forEach((r: any) => {
      if (r.fulfilled_by) r.fulfiller = fulfillerMap.get(r.fulfilled_by) || null;
    });
  }

  return { data: requests, error: null };
}

export async function getRequestsByUser(userId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: data || [], error: null };
}

export async function getRequest(requestId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("id", requestId)
    .single();

  if (error) return { data: null, error: error.message };

  if (data?.fulfilled_by) {
    const { data: fulfiller } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", data.fulfilled_by)
      .single();
    data.fulfiller = fulfiller;
  }

  return { data, error: null };
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

  const { data: request, error: fetchError } = await supabase
    .from("requests")
    .select("status, reward_credits, user_id")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) return { error: "Request not found" };
  if (request.status !== "open") return { error: "Request already fulfilled" };
  if (request.user_id === user.id) return { error: "You cannot fulfill your own request" };

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

  try {
    const { addCredits } = await import("@/actions/credits");
    await addCredits(request.reward_credits || 20, "fulfill_request", "Fulfilled a note request");
  } catch (e) {
    console.error("Credit assignment failed for fulfillment:", e);
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

export async function getRequestStats(userId?: string) {
  const supabase = await createClient();
  if (!supabase) return { open: 0, fulfilled: 0, myRequests: 0 };

  const [openResult, fulfilledResult, myResult] = await Promise.all([
    supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "open")
      .catch(() => ({ count: 0 })),
    supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "fulfilled")
      .catch(() => ({ count: 0 })),
    userId
      ? supabase.from("requests").select("*", { count: "exact", head: true }).eq("user_id", userId)
          .catch(() => ({ count: 0 }))
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    open: (openResult as any)?.count || 0,
    fulfilled: (fulfilledResult as any)?.count || 0,
    myRequests: (myResult as any)?.count || 0,
  };
}
