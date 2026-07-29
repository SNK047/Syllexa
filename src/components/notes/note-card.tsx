"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FileText, Download, Star, Clock, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    description?: string;
    file_url: string;
    downloads: number;
    average_rating?: number;
    created_at: string;
    users?: { name: string; avatar?: string; id?: string } | null;
    subjects?: { name: string; code: string } | null;
    units?: { number: number; title: string } | null;
  };
  currentUserId?: string;
  onDelete?: (noteId: string) => void;
}

export function NoteCard({ note, currentUserId, onDelete }: NoteCardProps) {
  const timeAgo = getTimeAgo(note.created_at);
  const isOwner = currentUserId && note.users?.id === currentUserId;
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) return;
    if (!confirm("Delete this note permanently?")) return;
    setDeleting(true);
    try {
      const { deleteNote } = await import("@/actions/notes");
      const { error } = await deleteNote(note.id);
      if (error) {
        console.error("Delete failed:", error);
        return;
      }
      onDelete?.(note.id);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative group/card">
      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button />}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover/card:opacity-100 data-open:opacity-100 focus-visible:opacity-100 outline-none"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Link href={`/notes/${note.id}`}>
        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-4 w-4" />
                {note.subjects?.code && (
                  <Badge variant="secondary" className="text-xs">
                    {note.subjects.code}
                  </Badge>
                )}
                {note.units?.number && (
                  <span>Unit {note.units.number}</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {note.title}
              </h3>
              {note.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {note.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {note.downloads}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {note.average_rating?.toFixed(1) || "0.0"}
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
            </div>

            {note.users && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                  {note.users.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-xs text-muted-foreground">{note.users.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
