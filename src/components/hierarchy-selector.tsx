"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  return (
    <div className="space-y-4">
      {/* University */}
      <div className="space-y-2">
        <Label>University</Label>
        <Select
          value={selected.universityId}
          onValueChange={(v) => setSelected((s) => ({ ...s, universityId: v || "" }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loading.universities ? "Loading..." : "Select university"} />
          </SelectTrigger>
          <SelectContent>
            {data.universities.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Department */}
      {selected.universityId && (
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={selected.departmentId}
            onValueChange={(v) => setSelected((s) => ({ ...s, departmentId: v || "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading.departments ? "Loading..." : "Select department"} />
            </SelectTrigger>
            <SelectContent>
              {data.departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Semester */}
      {selected.departmentId && (
        <div className="space-y-2">
          <Label>Semester</Label>
          <Select
            value={selected.semesterId}
            onValueChange={(v) => setSelected((s) => ({ ...s, semesterId: v || "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading.semesters ? "Loading..." : "Select semester"} />
            </SelectTrigger>
            <SelectContent>
              {data.semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Semester {s.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Subject */}
      {selected.semesterId && (
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select
            value={selected.subjectId}
            onValueChange={(v) => setSelected((s) => ({ ...s, subjectId: v || "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading.subjects ? "Loading..." : "Select subject"} />
            </SelectTrigger>
            <SelectContent>
              {data.subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Unit */}
      {selected.subjectId && (
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select
            value={selected.unitId}
            onValueChange={(v) => setSelected((s) => ({ ...s, unitId: v || "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading.units ? "Loading..." : "Select unit"} />
            </SelectTrigger>
            <SelectContent>
              {data.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  Unit {u.number} - {u.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
