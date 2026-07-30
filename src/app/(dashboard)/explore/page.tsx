"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/notes/note-card";
import { Search, BookOpen, Loader2, SlidersHorizontal, X, ExternalLink, Globe } from "lucide-react";

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get("q");
  const subjectParam = searchParams.get("subject");
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(queryParam || "");
  const [showFilters, setShowFilters] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(subjectParam || "");
  const [sortBy, setSortBy] = useState("newest");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [webResults, setWebResults] = useState<any[]>([]);
  const [webLoading, setWebLoading] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { getNotes, searchNotes } = await import("@/actions/notes");
      let result;
      if (searchQuery) {
        result = await searchNotes(searchQuery);
      } else {
        result = await getNotes({ limit: 50 });
      }
      if (result.data) {
        let filtered = result.data;
        if (selectedSubject) {
          filtered = result.data.filter((n: any) => n.subject_id === selectedSubject);
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
  }, [searchQuery, selectedSubject, sortBy]);

  useEffect(() => {
    loadCurrentUser();
    loadSubjects();
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (searchQuery && searchQuery.length >= 2) {
      loadWebResults();
    } else {
      setWebResults([]);
    }
  }, [searchQuery]);

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

  async function loadWebResults() {
    if (!searchQuery || searchQuery.length < 2) return;
    setWebLoading(true);
    try {
      const res = await fetch(`/api/search/web?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setWebResults(data.results || []);
    } catch (err) {
      console.error("Web search error:", err);
      setWebResults([]);
    } finally {
      setWebLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push("/explore");
      return;
    }
    router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`, { scroll: false });
  }

  function handleClearFilters() {
    setSelectedSubject("");
    setSortBy("newest");
    router.push("/explore");
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
          <Button type="submit">Search Notes & Web</Button>
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

          <Button size="sm" onClick={() => { loadNotes(); if (searchQuery) loadWebResults(); }}>
            Apply
          </Button>
        </div>
      )}

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 && !searchQuery ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            No notes uploaded yet. Be the first!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Database Notes */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Notes from Syllexa
              <span className="text-xs text-muted-foreground/50 font-normal">({notes.length} found)</span>
            </h2>
            {notes.length > 0 ? (
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
            ) : (
              <div className="rounded-lg border border-border/30 bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">No notes found in the database for this search.</p>
              </div>
            )}
          </div>

          {/* Web Results */}
          {searchQuery && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Web Results
                {webLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </h2>
              {webLoading && notes.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : webResults.length > 0 ? (
                <div className="space-y-2">
                  {webResults.map((r, i) => (
                    <a
                      key={i}
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border/30 bg-card p-3 hover:border-primary/30 hover:bg-accent/30 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-primary truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground/60 truncate">{r.source}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.snippet}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                !webLoading && (
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No web results found. Try a different search term or configure the Google Search API.
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
