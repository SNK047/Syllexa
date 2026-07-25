"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  FileText,
  Download,
  Star,
  Bookmark,
  Calendar,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ notes: 0, downloads: 0, bookmarks: 0 });
  const [notes, setNotes] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!supabase) return;

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return;

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    setUser(userData || {
      name: authUser.user_metadata?.name || authUser.email?.split("@")[0],
      email: authUser.email,
      avatar: authUser.user_metadata?.avatar,
    });

    const [notesRes, downloadsRes, bookmarksRes] = await Promise.all([
      supabase
        .from("notes")
        .select("*, subjects:subject_id (code)", { count: "exact", head: true })
        .eq("user_id", authUser.id),
      supabase
        .from("notes")
        .select("downloads")
        .eq("user_id", authUser.id),
      supabase
        .from("bookmarks")
        .select("*, notes:note_id (id, title, subjects:subject_id (code))")
        .eq("user_id", authUser.id),
    ]);

    const totalDownloads = (downloadsRes.data || []).reduce(
      (sum: number, n: any) => sum + (n.downloads || 0),
      0
    );

    setStats({
      notes: notesRes.count || 0,
      downloads: totalDownloads,
      bookmarks: bookmarksRes.data?.length || 0,
    });

    setBookmarks(bookmarksRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-16 w-16 rounded-full" />
              ) : (
                user?.name?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{user?.name}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {user?.credits || 0} credits
                </Badge>
                {user?.streak > 0 && (
                  <Badge variant="outline">
                    🔥 {user.streak} day streak
                  </Badge>
                )}
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  Joined {new Date(user?.created_at || Date.now()).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{stats.notes}</p>
            <p className="text-xs text-muted-foreground">Notes uploaded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Download className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{stats.downloads}</p>
            <p className="text-xs text-muted-foreground">Total downloads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Bookmark className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{stats.bookmarks}</p>
            <p className="text-xs text-muted-foreground">Bookmarks</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookmarks">
        <TabsList>
          <TabsTrigger value="bookmarks">
            <Bookmark className="h-4 w-4 mr-1" />
            Bookmarks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookmarks" className="mt-4">
          {bookmarks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No bookmarks yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((b: any) => {
                const note = b.notes;
                if (!note) return null;
                return (
                  <Card key={b.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {note.subjects?.code && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {note.subjects.code}
                          </Badge>
                        )}
                        <Link
                          href={`/notes/${note.id}`}
                          className="text-sm font-medium hover:text-primary truncate"
                        >
                          {note.title}
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
