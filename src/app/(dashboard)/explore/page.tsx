"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/notes/note-card";
import { Search, BookOpen, Loader2, SlidersHorizontal, X } from "lucide-react";

export default function ExplorePage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadNotes();
    loadSubjects();
  }, []);

  async function loadCurrentUser() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  async function loadSubjects() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("subjects")
      .select("id, name, code")
      .order("code");
    setSubjects(data || []);
  }

  async function loadNotes() {
    setLoading(true);
    try {
      const { getNotes } = await import("@/actions/notes");
      const { data, error } = await getNotes({ limit: 50 });
      if (data) {
        let filtered = data;
        if (selectedSubject) {
          filtered = data.filter((n: any) => n.subject_id === selectedSubject);
        }
        if (sortBy === "popular") {
          filtered.sort((a: any, b: any) => (b.downloads || 0) - (a.downloads || 0));
        } else if (sortBy === "rated") {
          filtered.sort((a: any, b: any) => (b.average_rating || 0) - (a.average_rating || 0));
        }
        setNotes(filtered);
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadNotes();
      return;
    }
    setLoading(true);
    try {
      const { searchNotes } = await import("@/actions/notes");
      const { data } = await searchNotes(searchQuery);
      if (data) setNotes(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleClearFilters() {
    setSelectedSubject("");
    setSortBy("newest");
    loadNotes();
  }

  const hasFilters = selectedSubject || sortBy !== "newest";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Explore Notes</h1>
        <p className="text-muted-foreground">
          Browse notes from students across universities
        </p>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {hasFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border border-border/50 bg-card">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
              }}
              className="block w-48 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-40 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Downloaded</option>
              <option value="rated">Highest Rated</option>
            </select>
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          <Button size="sm" onClick={loadNotes}>
            Apply
          </Button>
        </div>
      )}

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? "No notes found matching your search." : "No notes uploaded yet. Be the first!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              currentUserId={currentUserId || undefined}
              onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
