"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";

interface Rating {
  id: string;
  score: number;
  review: string | null;
  created_at: string;
  user_id: string;
  users: { id: string; name: string; avatar: string | null };
}

export function Ratings({ noteId, averageRating }: { noteId: string; averageRating: number }) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useState(() => {
    loadRatings();
  });

  async function loadRatings() {
    const { getRatings } = await import("@/actions/ratings");
    const { data } = await getRatings(noteId);
    setRatings(data || []);
    setLoading(false);
  }

  async function handleSubmitRating() {
    if (userRating === 0) return;
    setSubmitting(true);
    const { addRating } = await import("@/actions/ratings");
    const { data } = await addRating(noteId, userRating, review || undefined);
    if (data) {
      await loadRatings();
      setReview("");
    }
    setSubmitting(false);
  }

  const displayRating = hoverRating || userRating;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Star className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">Ratings</span>
        <span className="text-muted-foreground text-sm">
          {averageRating.toFixed(1)} average · {ratings.length} ratings
        </span>
      </div>

      {/* User Rating Input */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              className="p-0.5"
              onMouseEnter={() => setHoverRating(score)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setUserRating(score)}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  score <= displayRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        {userRating > 0 && (
          <span className="text-sm text-muted-foreground">{userRating}/5</span>
        )}
      </div>

      {userRating > 0 && (
        <div className="space-y-2">
          <Textarea
            placeholder="Write a review (optional)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
          />
          <Button size="sm" onClick={handleSubmitRating} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Star className="h-4 w-4 mr-2" />
            )}
            Submit Rating
          </Button>
        </div>
      )}

      {/* Ratings List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : ratings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No ratings yet. Be the first to rate.
        </p>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div key={r.id} className="border-b pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${
                        s <= r.score
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{r.users?.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.review && <p className="text-sm mt-1 text-muted-foreground">{r.review}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
