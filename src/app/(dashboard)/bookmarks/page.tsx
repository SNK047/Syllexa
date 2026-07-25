"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, Bookmark } from "lucide-react";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  async function loadBookmarks() {
    const { getBookmarks } = await import("@/actions/bookmarks");
    const { data } = await getBookmarks();
    setBookmarks(data || []);
    setLoading(false);
  }

  async function handleRemoveBookmark(noteId: string) {
    const { removeBookmark } = await import("@/actions/bookmarks");
    await removeBookmark(noteId);
    setBookmarks((prev) => prev.filter((b) => b.notes?.id !== noteId));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bookmark className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Bookmarks</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No bookmarks yet. Save notes to access them quickly.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map((b) => {
            const note = b.notes;
            if (!note) return null;
            return (
              <Card key={b.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={`/notes/${note.id}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-2"
                    >
                      {note.title}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveBookmark(note.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {note.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {note.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {note.subjects?.code && (
                      <Badge variant="secondary" className="text-xs">
                        {note.subjects.code}
                      </Badge>
                    )}
                    {note.units?.number && (
                      <Badge variant="outline" className="text-xs">
                        Unit {note.units.number}
                      </Badge>
                    )}
                    <span>·</span>
                    <span>{note.downloads} downloads</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
