"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Flame, Star } from "lucide-react";

const icons: Record<number, any> = {
  0: <Crown className="h-5 w-5 text-yellow-500" />,
  1: <Medal className="h-5 w-5 text-gray-400" />,
  2: <Medal className="h-5 w-5 text-amber-600" />,
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    loadLeaderboard(period);
  }, [period]);

  async function loadLeaderboard(selectedPeriod: string) {
    setLoading(true);
    const { getLeaderboard } = await import("@/actions/credits");
    const { data } = await getLeaderboard(selectedPeriod as any);
    setLeaderboard(data || []);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setPeriod(v)}>
        <TabsList>
          <TabsTrigger value="all">All Time</TabsTrigger>
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>

        {["all", "weekly", "monthly"].map((p) => (
          <TabsContent key={p} value={p} className="mt-4">
            {period === p && <LeaderboardList items={leaderboard} loading={loading} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LeaderboardList({ items, loading }: { items: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No contributors yet. Be the first!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((user, index) => (
        <Card
          key={user.id}
          className={index < 3 ? "border-primary/20 bg-primary/5" : ""}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-8 text-center font-bold text-lg">
              {icons[index] || <span className="text-muted-foreground">{index + 1}</span>}
            </div>
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-10 w-10 rounded-full" />
              ) : (
                user.name?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-3 w-3" />
                {user.credits} credits
                {user.streak > 0 && (
                  <>
                    <span>·</span>
                    <Flame className="h-3 w-3 text-orange-500" />
                    {user.streak} day streak
                  </>
                )}
              </div>
            </div>
            <Badge variant={index < 3 ? "default" : "secondary"}>
              #{index + 1}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
