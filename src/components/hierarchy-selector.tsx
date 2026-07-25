"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";

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
    universities: false,
    departments: false,
    semesters: false,
    subjects: false,
    units: false,
  });

  useEffect(() => {
    loadUniversities();
  }, []);

  useEffect(() => {
    if (selected.universityId) {
      loadDepartments(selected.universityId);
      setSelected((s) => ({ ...s, departmentId: "", semesterId: "", subjectId: "", unitId: "" }));
    }
  }, [selected.universityId]);

  useEffect(() => {
    if (selected.departmentId) {
      loadSemesters(selected.departmentId);
      setSelected((s) => ({ ...s, semesterId: "", subjectId: "", unitId: "" }));
    }
  }, [selected.departmentId]);

  useEffect(() => {
    if (selected.semesterId) {
      loadSubjects(selected.semesterId);
      setSelected((s) => ({ ...s, subjectId: "", unitId: "" }));
    }
  }, [selected.semesterId]);

  useEffect(() => {
    if (selected.subjectId) {
      loadUnits(selected.subjectId);
      setSelected((s) => ({ ...s, unitId: "" }));
    }
  }, [selected.subjectId]);

  useEffect(() => {
    if (selected.unitId) {
      onSelect(selected);
    }
  }, [selected.unitId]);

  async function loadUniversities() {
    setLoading((l) => ({ ...l, universities: true }));
    const { getUniversities } = await import("@/actions/hierarchy");
    const { data } = await getUniversities();
    setData((d) => ({ ...d, universities: data || [] }));
    setLoading((l) => ({ ...l, universities: false }));
  }

  async function loadDepartments(universityId: string) {
    setLoading((l) => ({ ...l, departments: true }));
    const { getDepartments } = await import("@/actions/hierarchy");
    const { data } = await getDepartments(universityId);
    setData((d) => ({ ...d, departments: data || [] }));
    setLoading((l) => ({ ...l, departments: false }));
  }

  async function loadSemesters(departmentId: string) {
    setLoading((l) => ({ ...l, semesters: true }));
    const { getSemesters } = await import("@/actions/hierarchy");
    const { data } = await getSemesters(departmentId);
    setData((d) => ({ ...d, semesters: data || [] }));
    setLoading((l) => ({ ...l, semesters: false }));
  }

  async function loadSubjects(semesterId: string) {
    setLoading((l) => ({ ...l, subjects: true }));
    const { getSubjects } = await import("@/actions/hierarchy");
    const { data } = await getSubjects(semesterId);
    setData((d) => ({ ...d, subjects: data || [] }));
    setLoading((l) => ({ ...l, subjects: false }));
  }

  async function loadUnits(subjectId: string) {
    setLoading((l) => ({ ...l, units: true }));
    const { getUnits } = await import("@/actions/hierarchy");
    const { data } = await getUnits(subjectId);
    setData((d) => ({ ...d, units: data || [] }));
    setLoading((l) => ({ ...l, units: false }));
  }

  const selectClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-4">
      {/* University */}
      <div className="space-y-2">
        <Label>University</Label>
        <select
          className={selectClass}
          value={selected.universityId}
          onChange={(e) => setSelected((s) => ({ ...s, universityId: e.target.value }))}
        >
          <option value="">
            {loading.universities ? "Loading..." : "Select university"}
          </option>
          {data.universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Department */}
      {selected.universityId && (
        <div className="space-y-2">
          <Label>Department</Label>
          <select
            className={selectClass}
            value={selected.departmentId}
            onChange={(e) => setSelected((s) => ({ ...s, departmentId: e.target.value }))}
          >
            <option value="">
              {loading.departments ? "Loading..." : "Select department"}
            </option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Semester */}
      {selected.departmentId && (
        <div className="space-y-2">
          <Label>Semester</Label>
          <select
            className={selectClass}
            value={selected.semesterId}
            onChange={(e) => setSelected((s) => ({ ...s, semesterId: e.target.value }))}
          >
            <option value="">
              {loading.semesters ? "Loading..." : "Select semester"}
            </option>
            {data.semesters.map((s) => (
              <option key={s.id} value={s.id}>
                Semester {s.number}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Subject */}
      {selected.semesterId && (
        <div className="space-y-2">
          <Label>Subject</Label>
          <select
            className={selectClass}
            value={selected.subjectId}
            onChange={(e) => setSelected((s) => ({ ...s, subjectId: e.target.value }))}
          >
            <option value="">
              {loading.subjects ? "Loading..." : "Select subject"}
            </option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Unit */}
      {selected.subjectId && (
        <div className="space-y-2">
          <Label>Unit</Label>
          <select
            className={selectClass}
            value={selected.unitId}
            onChange={(e) => setSelected((s) => ({ ...s, unitId: e.target.value }))}
          >
            <option value="">
              {loading.units ? "Loading..." : "Select unit"}
            </option>
            {data.units.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.number} - {u.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
