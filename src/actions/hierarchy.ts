"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUniversities() {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .order("name");

  return { data, error: error?.message };
}

export async function getDepartments(universityId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("university_id", universityId)
    .order("name");

  return { data, error: error?.message };
}

export async function getSemesters(departmentId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("semesters")
    .select("*")
    .eq("department_id", departmentId)
    .order("number");

  return { data, error: error?.message };
}

export async function getSubjects(semesterId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("semester_id", semesterId)
    .order("code");

  return { data, error: error?.message };
}

export async function getUnits(subjectId: string) {
  const supabase = await createClient();
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("subject_id", subjectId)
    .order("number");

  return { data, error: error?.message };
}
