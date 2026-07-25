"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Clock, AlertTriangle } from "lucide-react";

interface RequestCardProps {
  request: {
    id: string;
    description: string;
    urgency: string;
    reward_credits: number;
    status: string;
    created_at: string;
    users?: { name: string; avatar?: string } | null;
    subjects?: { name: string; code: string } | null;
    units?: { number: number; title: string } | null;
  };
}

export function RequestCard({ request }: RequestCardProps) {
  const timeAgo = getTimeAgo(request.created_at);
  const isUrgent = request.urgency === "urgent";

  return (
    <Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            {request.subjects?.code && (
              <Badge variant="secondary" className="text-xs">
                {request.subjects.code}
              </Badge>
            )}
            {request.units?.number && (
              <span className="text-muted-foreground">Unit {request.units.number}</span>
            )}
            {isUrgent && (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Urgent
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Coins className="h-3 w-3 text-yellow-500" />
            {request.reward_credits}
          </Badge>
        </div>

        <p className="text-sm line-clamp-3">{request.description}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
          <Badge variant={request.status === "open" ? "default" : "secondary"} className="text-xs">
            {request.status}
          </Badge>
        </div>

        {request.users && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
              {request.users.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground">{request.users.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
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
