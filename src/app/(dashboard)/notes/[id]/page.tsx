"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Comments } from "@/components/comments/comments";
import { Ratings } from "@/components/ratings/ratings";
import { ArrowLeft, Download, Star, Clock, FileText, Loader2, Bookmark } from "lucide-react";
import Link from "next/link";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    loadNote();
  }, [params.id]);

  async function loadNote() {
    try {
      const { getNote } = await import("@/actions/notes");
      const { data } = await getNote(params.id as string);
      setNote(data);

      const { isBookmarked } = await import("@/actions/bookmarks");
      const isMarked = await isBookmarked(params.id as string);
      setBookmarked(isMarked);
    } catch (err) {
      console.error("Failed to load note:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleBookmark() {
    const { addBookmark, removeBookmark } = await import("@/actions/bookmarks");
    if (bookmarked) {
      await removeBookmark(note.id);
      setBookmarked(false);
    } else {
      await addBookmark(note.id);
      setBookmarked(true);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Note not found.</p>
        <Link href="/explore">
          <Button variant="ghost" className="mt-4">Back to Explore</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          {note.subjects?.code && <Badge variant="secondary">{note.subjects.code}</Badge>}
          {note.units?.number && <Badge variant="outline">Unit {note.units.number}</Badge>}
        </div>
        <h1 className="text-2xl font-bold">{note.title}</h1>
        {note.description && <p className="text-muted-foreground">{note.description}</p>}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        {note.users && (
          <span className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {note.users.name?.[0]?.toUpperCase()}
            </div>
            {note.users.name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          {note.downloads} downloads
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-4 w-4" />
          {note.average_rating?.toFixed(1) || "0.0"} rating
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {new Date(note.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button render={<a href={note.file_url} target="_blank" rel="noopener noreferrer" download />}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button variant={bookmarked ? "default" : "outline"} onClick={toggleBookmark}>
          <Bookmark className={`h-4 w-4 mr-2 ${bookmarked ? "fill-current" : ""}`} />
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </Button>
      </div>

      <Tabs defaultValue="viewer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="viewer">
            <FileText className="h-4 w-4 mr-1" />
            Document
          </TabsTrigger>
          <TabsTrigger value="comments">
            <FileText className="h-4 w-4 mr-1" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="ratings">
            <Star className="h-4 w-4 mr-1" />
            Ratings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer">
          <Card>
            <CardContent className="p-0">
              <iframe
                src={note.file_url}
                className="w-full h-[600px] rounded-lg"
                title={note.title}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardContent className="p-6">
              <Comments noteId={note.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card>
            <CardContent className="p-6">
              <Ratings noteId={note.id} averageRating={note.average_rating || 0} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
