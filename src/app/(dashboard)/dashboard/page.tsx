"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/notes/note-card";
import {
  BookOpen,
  Upload,
  FileText,
  Trophy,
  TrendingUp,
  Coins,
  Flame,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const [userName, setUserName] = useState("Student");
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalNotes: 0,
    openRequests: 0,
    credits: 100,
    rank: "--",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserName(
          user.user_metadata?.name || user.email?.split("@")[0] || "Student"
        );

        // Fetch recent notes
        const { getNotes } = await import("@/actions/notes");
        const { data: notes } = await getNotes({ limit: 3 });
        if (notes) {
          setRecentNotes(notes);
          setStats((s) => ({ ...s, totalNotes: notes.length }));
        }

        // Fetch open requests count
        const { getAllRequests } = await import("@/actions/requests");
        const { data: requests } = await getAllRequests(100);
        if (requests) {
          const openRequests = requests.filter((r: any) => r.status === "open").length;
          setStats((s) => ({ ...s, openRequests }));
        }
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {userName} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your notes today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Total Notes"
          value={stats.totalNotes.toString()}
          color="text-blue-500"
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Open Requests"
          value={stats.openRequests.toString()}
          color="text-orange-500"
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label="Credits"
          value={stats.credits.toString()}
          color="text-yellow-500"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Rank"
          value={stats.rank}
          color="text-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/upload">
            <QuickActionCard
              icon={<Upload className="h-6 w-6" />}
              title="Upload Notes"
              description="Share your notes with classmates"
            />
          </Link>
          <Link href="/requests">
            <QuickActionCard
              icon={<FileText className="h-6 w-6" />}
              title="Request Notes"
              description="Find the notes you need"
            />
          </Link>
          <Link href="/leaderboard">
            <QuickActionCard
              icon={<Trophy className="h-6 w-6" />}
              title="Leaderboard"
              description="See top contributors"
            />
          </Link>
          <Link href="/ai-chat">
            <QuickActionCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Chat with AI"
              description="Ask questions about your notes"
            />
          </Link>
        </div>
      </div>

      {/* Recent Notes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Notes</h2>
          <Link href="/explore">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentNotes.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No notes yet. Upload your first note to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className={`flex items-center justify-center size-10 rounded-lg bg-muted ${color}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3 hover:border-primary/50 transition-colors cursor-pointer">
      <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
