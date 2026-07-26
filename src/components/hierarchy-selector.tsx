"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HierarchyData {
  universities: any[];
  departments: any[];
  semesters: any[];
  subjects: any[];
  units: any[];
}

interface HierarchySelectorProps {
  onSelect: (data: {
    universityId: string;
    departmentId: string;
    semesterId: string;
    subjectId: string;
    unitId: string;
  }) => void;
  initial?: {
    universityId?: string;
    departmentId?: string;
    semesterId?: string;
    subjectId?: string;
    unitId?: string;
  };
}

export function HierarchySelector({ onSelect, initial }: HierarchySelectorProps) {
  const [data, setData] = useState<HierarchyData>({
    universities: [],
    departments: [],
    semesters: [],
    subjects: [],
    units: [],
  });

  const [selected, setSelected] = useState({
    universityId: initial?.universityId || "",
    departmentId: initial?.departmentId || "",
    semesterId: initial?.semesterId || "",
    subjectId: initial?.subjectId || "",
    unitId: initial?.unitId || "",
  });

  const [loading, setLoading] = useState({
    universities: true,
    departments: false,
    semesters: false,
    subjects: false,
    units: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => { loadUniversities(); }, []);

  useEffect(() => {
    if (selected.universityId) {
      setData((d) => ({ ...d, departments: [], semesters: [], subjects: [], units: [] }));
      setSelected((s) => ({ ...s, departmentId: "", semesterId: "", subjectId: "", unitId: "" }));
      loadDepartments(selected.universityId);
    }
  }, [selected.universityId]);

  useEffect(() => {
    if (selected.departmentId) {
      setData((d) => ({ ...d, semesters: [], subjects: [], units: [] }));
      setSelected((s) => ({ ...s, semesterId: "", subjectId: "", unitId: "" }));
      loadSemesters(selected.departmentId);
    }
  }, [selected.departmentId]);

  useEffect(() => {
    if (selected.semesterId) {
      setData((d) => ({ ...d, subjects: [], units: [] }));
      setSelected((s) => ({ ...s, subjectId: "", unitId: "" }));
      loadSubjects(selected.semesterId);
    }
  }, [selected.semesterId]);

  useEffect(() => {
    if (selected.subjectId) {
      setData((d) => ({ ...d, units: [] }));
      setSelected((s) => ({ ...s, unitId: "" }));
      loadUnits(selected.subjectId);
    }
  }, [selected.subjectId]);

  useEffect(() => {
    if (selected.unitId) onSelect(selected);
  }, [selected.unitId]);

  async function loadUniversities() {
    setLoading((l) => ({ ...l, universities: true }));
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("universities").select("*").order("name");
      if (!mountedRef.current) return;
      if (error) throw error;
      setData((d) => ({ ...d, universities: data || [] }));
    } catch (err: any) {
      if (!mountedRef.current) return;
      setErrors((e) => ({ ...e, universities: err?.message || "Failed to load" }));
    }
    setLoading((l) => ({ ...l, universities: false }));
  }

  async function loadDepartments(universityId: string) {
    setLoading((l) => ({ ...l, departments: true }));
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("departments").select("*").eq("university_id", universityId).order("name");
      if (!mountedRef.current) return;
      if (error) throw error;
      setData((d) => ({ ...d, departments: data || [] }));
    } catch (err: any) {
      if (!mountedRef.current) return;
      setErrors((e) => ({ ...e, departments: err?.message || "Failed to load" }));
    }
    setLoading((l) => ({ ...l, departments: false }));
  }

  async function loadSemesters(departmentId: string) {
    setLoading((l) => ({ ...l, semesters: true }));
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("semesters").select("*").eq("department_id", departmentId).order("number");
      if (!mountedRef.current) return;
      if (error) throw error;
      setData((d) => ({ ...d, semesters: data || [] }));
    } catch (err: any) {
      if (!mountedRef.current) return;
      setErrors((e) => ({ ...e, semesters: err?.message || "Failed to load" }));
    }
    setLoading((l) => ({ ...l, semesters: false }));
  }

  async function loadSubjects(semesterId: string) {
    setLoading((l) => ({ ...l, subjects: true }));
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("subjects").select("*").eq("semester_id", semesterId).order("code");
      if (!mountedRef.current) return;
      if (error) throw error;
      setData((d) => ({ ...d, subjects: data || [] }));
    } catch (err: any) {
      if (!mountedRef.current) return;
      setErrors((e) => ({ ...e, subjects: err?.message || "Failed to load" }));
    }
    setLoading((l) => ({ ...l, subjects: false }));
  }

  async function loadUnits(subjectId: string) {
    setLoading((l) => ({ ...l, units: true }));
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("units").select("*").eq("subject_id", subjectId).order("number");
      if (!mountedRef.current) return;
      if (error) throw error;
      setData((d) => ({ ...d, units: data || [] }));
    } catch (err: any) {
      if (!mountedRef.current) return;
      setErrors((e) => ({ ...e, units: err?.message || "Failed to load" }));
    }
    setLoading((l) => ({ ...l, units: false }));
  }

  const selectClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50";

  function renderError(key: string) {
    if (!errors[key]) return null;
    return <p className="text-xs text-destructive mt-1">{errors[key]}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>University *</Label>
        <div className="relative">
          <select
            className={selectClass}
            value={selected.universityId}
            onChange={(e) => setSelected((s) => ({ ...s, universityId: e.target.value }))}
            disabled={loading.universities}
          >
            <option value="">{loading.universities ? "Loading universities..." : "Select university"}</option>
            {data.universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {loading.universities && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />}
        </div>
        {renderError("universities")}
        {!loading.universities && data.universities.length === 0 && !errors.universities && (
          <p className="text-xs text-muted-foreground">No universities found</p>
        )}
      </div>

      {selected.universityId && (
        <div className="space-y-2">
          <Label>Department *</Label>
          <div className="relative">
            <select
              className={selectClass}
              value={selected.departmentId}
              onChange={(e) => setSelected((s) => ({ ...s, departmentId: e.target.value }))}
              disabled={loading.departments}
            >
              <option value="">{loading.departments ? "Loading departments..." : "Select department"}</option>
              {data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {loading.departments && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />}
          </div>
          {renderError("departments")}
        </div>
      )}

      {selected.departmentId && (
        <div className="space-y-2">
          <Label>Semester *</Label>
          <div className="relative">
            <select
              className={selectClass}
              value={selected.semesterId}
              onChange={(e) => setSelected((s) => ({ ...s, semesterId: e.target.value }))}
              disabled={loading.semesters}
            >
              <option value="">{loading.semesters ? "Loading semesters..." : "Select semester"}</option>
              {data.semesters.map((s) => <option key={s.id} value={s.id}>Semester {s.number}</option>)}
            </select>
            {loading.semesters && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />}
          </div>
          {renderError("semesters")}
        </div>
      )}

      {selected.semesterId && (
        <div className="space-y-2">
          <Label>Subject *</Label>
          <div className="relative">
            <select
              className={selectClass}
              value={selected.subjectId}
              onChange={(e) => setSelected((s) => ({ ...s, subjectId: e.target.value }))}
              disabled={loading.subjects}
            >
              <option value="">{loading.subjects ? "Loading subjects..." : "Select subject"}</option>
              {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
            {loading.subjects && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />}
          </div>
          {renderError("subjects")}
        </div>
      )}

      {selected.subjectId && (
        <div className="space-y-2">
          <Label>Unit *</Label>
          <div className="relative">
            <select
              className={selectClass}
              value={selected.unitId}
              onChange={(e) => setSelected((s) => ({ ...s, unitId: e.target.value }))}
              disabled={loading.units}
            >
              <option value="">{loading.units ? "Loading units..." : "Select unit"}</option>
              {data.units.map((u) => <option key={u.id} value={u.id}>Unit {u.number} - {u.title}</option>)}
            </select>
            {loading.units && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />}
          </div>
          {renderError("units")}
        </div>
      )}
    </div>
  );
}
