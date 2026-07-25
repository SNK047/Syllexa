"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequestCard } from "@/components/requests/request-card";
import { HierarchySelector } from "@/components/hierarchy-selector";
import { Plus, FileText, Loader2, Coins } from "lucide-react";

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [rewardCredits, setRewardCredits] = useState(10);
  const [hierarchy, setHierarchy] = useState({
    universityId: "",
    departmentId: "",
    semesterId: "",
    subjectId: "",
    unitId: "",
  });

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const { getRequests } = await import("@/actions/requests");
      const { data } = await getRequests({ limit: 20 });
      if (data) setRequests(data);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hierarchy.unitId || !description.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { createRequest } = await import("@/actions/requests");
      const { data, error: createError } = await createRequest({
        subject_id: hierarchy.subjectId,
        unit_id: hierarchy.unitId,
        description,
        urgency,
        reward_credits: rewardCredits,
      });

      if (createError) {
        setError(createError);
        return;
      }

      setDialogOpen(false);
      resetForm();
      loadRequests();
    } catch (err) {
      setError("Failed to create request");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setDescription("");
    setUrgency("normal");
    setRewardCredits(10);
    setHierarchy({ universityId: "", departmentId: "", semesterId: "", subjectId: "", unitId: "" });
    setError("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Note Requests</h1>
          <p className="text-muted-foreground">
            Browse open requests or create your own
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Notes</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Subject *</Label>
                <HierarchySelector onSelect={setHierarchy} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="req-description">What notes do you need? *</Label>
                <Textarea
                  id="req-description"
                  placeholder="e.g. Need detailed notes on Database Normalization with examples..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select value={urgency} onValueChange={(v) => setUrgency(v || "normal")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reward Credits</Label>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      value={rewardCredits}
                      onChange={(e) => setRewardCredits(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !hierarchy.unitId}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Publish Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            No open requests. Create one to find the notes you need!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
