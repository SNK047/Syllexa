"use server";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export async function uploadFile(file: File, path: string) {
  const supabase = await createClient();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { data: null, error: "Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, DOC, DOCX, TXT, PPT, PPTX" };
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
