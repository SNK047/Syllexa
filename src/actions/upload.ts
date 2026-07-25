"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadFile(file: File, path: string) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  if (file.type !== "application/pdf") {
    return { data: null, error: "Only PDF files are allowed" };
  }

  const { data, error } = await supabase.storage
    .from("notes")
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) return { data: null, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("notes").getPublicUrl(path);

  return { data: { path: data.path, publicUrl }, error: null };
}

export async function getFileUrl(path: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from("notes").getPublicUrl(path);

  return publicUrl;
}

export async function deleteFile(path: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase.storage.from("notes").remove([path]);
  return { error: error?.message };
}
