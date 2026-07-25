"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  FileText,
  Download,
  Ban,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { getAdminStats, getAllUsers, getAllNotesAdmin } = await import("@/actions/admin");
    const [statsRes, usersRes, notesRes] = await Promise.all([
      getAdminStats(),
      getAllUsers(),
      getAllNotesAdmin(),
    ]);
    setStats(statsRes.data);
    setUsers(usersRes.data || []);
    setNotes(notesRes.data || []);
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalNotes}</p>
              <p className="text-xs text-muted-foreground">Notes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Download className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalDownloads}</p>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalRequests}</p>
              <p className="text-xs text-muted-foreground">Requests</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1" />
            Users
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-4 w-4 mr-1" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full" />
                      ) : (
                        user.name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{user.credits || 0} credits</Badge>
                      {user.banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const { toggleUserBan } = await import("@/actions/admin");
                          await toggleUserBan(user.id, !user.banned);
                          setUsers((prev) =>
                            prev.map((u) =>
                              u.id === user.id ? { ...u, banned: !u.banned } : u
                            )
                          );
                        }}
                      >
                        {user.banned ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Ban className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {notes.map((note) => (
                  <div key={note.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/notes/${note.id}`}
                          className="font-medium hover:text-primary transition-colors truncate"
                        >
                          {note.title}
                        </a>
                        {note.subjects?.code && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {note.subjects.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        by {note.users?.name || "Unknown"} · {note.downloads || 0} downloads
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const { deleteNoteAdmin } = await import("@/actions/admin");
                        const { error } = await deleteNoteAdmin(note.id);
                        if (!error) {
                          setNotes((prev) => prev.filter((n) => n.id !== note.id));
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
