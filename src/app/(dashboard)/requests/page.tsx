"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HierarchySelector } from "@/components/hierarchy-selector";
import {
  Plus,
  FileText,
  Loader2,
  Coins,
  Clock,
  AlertTriangle,
  Upload,
  X,
  Trash2,
  Pencil,
  CheckCircle,
} from "lucide-react";

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Create form
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

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editUrgency, setEditUrgency] = useState("normal");
  const [editCredits, setEditCredits] = useState(10);

  // Fulfill upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fulfillFile, setFulfillFile] = useState<File | null>(null);
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => {
    loadRequests();
    loadUser();
  }, []);

  async function loadUser() {
    const { ensureUser } = await import("@/actions/ensure-user");
    const user = await ensureUser();
    setCurrentUser(user);
  }

  async function loadRequests() {
    setLoading(true);
    try {
      const { getAllRequests } = await import("@/actions/requests");
      const { data } = await getAllRequests(50);
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
      const { error: createError } = await createRequest({
        subject_id: hierarchy.subjectId,
        unit_id: hierarchy.unitId,
        description,
        urgency,
        reward_credits: rewardCredits,
      });
      if (createError) {
        setError(createError);
        setSubmitting(false);
        return;
      }
      setDialogOpen(false);
      resetForm();
      loadRequests();
    } catch {
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

  async function openDetail(request: any) {
    setDetailRequest(request);
    setEditing(false);
    setFulfillFile(null);
    setEditDescription(request.description);
    setEditUrgency(request.urgency);
    setEditCredits(request.reward_credits);
  }

  async function handleSaveEdit() {
    if (!detailRequest) return;
    setSubmitting(true);
    const { updateRequest } = await import("@/actions/requests");
    const { error } = await updateRequest(detailRequest.id, {
      description: editDescription,
      urgency: editUrgency,
      reward_credits: editCredits,
    });
    if (!error) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === detailRequest.id
            ? { ...r, description: editDescription, urgency: editUrgency, reward_credits: editCredits }
            : r
        )
      );
      setDetailRequest({
        ...detailRequest,
        description: editDescription,
        urgency: editUrgency,
        reward_credits: editCredits,
      });
      setEditing(false);
    }
    setSubmitting(false);
  }

  async function handleFulfill() {
    if (!detailRequest || !fulfillFile) return;
    setFulfilling(true);
    setError("");

    try {
      // 1. Extract text from PDF
      let contentText = "";
      try {
        const { extractTextFromPDF } = await import("@/lib/pdf-extract");
        contentText = await extractTextFromPDF(fulfillFile);
      } catch {}

      // 2. Upload file
      const { uploadFile } = await import("@/actions/upload");
      const fileExt = fulfillFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const uploadResult = await uploadFile(fulfillFile, filePath);
      if (uploadResult.error) {
        setError(uploadResult.error);
        setFulfilling(false);
        return;
      }

      // 3. Create note
      const { createNote } = await import("@/actions/notes");
      const noteResult = await createNote({
        title: `Fulfilled: ${detailRequest.description.slice(0, 80)}`,
        description: detailRequest.description,
        subject_id: detailRequest.subject_id,
        unit_id: detailRequest.unit_id,
        file_url: uploadResult.data!.publicUrl,
        file_size: fulfillFile.size,
        content_text: contentText || undefined,
      });
      if (noteResult.error) {
        setError(noteResult.error);
        setFulfilling(false);
        return;
      }

      // 4. Mark request as fulfilled
      const { fulfillRequest } = await import("@/actions/requests");
      const { error: fulfillError } = await fulfillRequest(detailRequest.id, noteResult.data.id);
      if (fulfillError) {
        setError(fulfillError);
        setFulfilling(false);
        return;
      }

      // 5. Update local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === detailRequest.id
            ? { ...r, status: "fulfilled", fulfilled_by: currentUser?.id, note_id: noteResult.data.id }
            : r
        )
      );
      setDetailRequest(null);
      setFulfillFile(null);
    } catch {
      setError("Failed to fulfill request");
    } finally {
      setFulfilling(false);
    }
  }

  async function handleDelete() {
    if (!detailRequest) return;
    const { deleteRequest } = await import("@/actions/requests");
    const { error } = await deleteRequest(detailRequest.id);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== detailRequest.id));
      setDetailRequest(null);
    }
  }

  const isOwner = currentUser && detailRequest && currentUser.id === detailRequest.user_id;
  const isOpen = detailRequest?.status === "open";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Note Requests</h1>
          <p className="text-muted-foreground">Browse open requests or create your own</p>
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
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}
              <div className="space-y-2">
                <Label>Subject *</Label>
                <HierarchySelector onSelect={setHierarchy} />
              </div>
              <div className="space-y-2">
                <Label>What notes do you need? *</Label>
                <Textarea
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
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
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
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
          <p className="text-muted-foreground">No open requests. Create one to find the notes you need!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="group hover:border-primary/50 transition-colors cursor-pointer h-full"
              onClick={() => openDetail(request)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {request.subjects?.code && (
                      <Badge variant="secondary" className="text-xs">{request.subjects.code}</Badge>
                    )}
                    {request.units?.number && (
                      <span className="text-muted-foreground">Unit {request.units.number}</span>
                    )}
                    {request.urgency === "urgent" && (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Urgent
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs flex items-center gap-1 shrink-0">
                    <Coins className="h-3 w-3 text-yellow-500" /> {request.reward_credits}
                  </Badge>
                </div>
                <p className="text-sm line-clamp-3">{request.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {getTimeAgo(request.created_at)}
                  </span>
                  <Badge variant={request.status === "open" ? "default" : "secondary"} className="text-xs">
                    {request.status === "fulfilled" ? "Fulfilled" : "Open"}
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
          ))}
        </div>
      )}

      {/* Request Detail Dialog */}
      {detailRequest && (
        <Dialog open={!!detailRequest} onOpenChange={(open) => { if (!open) setDetailRequest(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {detailRequest.status === "fulfilled" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                {editing ? "Edit Request" : "Request Details"}
              </DialogTitle>
            </DialogHeader>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              {detailRequest.subjects?.code && (
                <Badge variant="secondary">{detailRequest.subjects.code}</Badge>
              )}
              {detailRequest.units?.number && (
                <Badge variant="outline">Unit {detailRequest.units.number}</Badge>
              )}
              {detailRequest.urgency === "urgent" && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-yellow-500" /> {detailRequest.reward_credits} credits
              </Badge>
              <Badge variant={detailRequest.status === "open" ? "default" : "secondary"}>
                {detailRequest.status === "fulfilled" ? "Fulfilled" : "Open"}
              </Badge>
            </div>

            {/* Requester */}
            {detailRequest.users && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {detailRequest.users.name?.[0]?.toUpperCase()}
                </div>
                <span>Requested by {detailRequest.users.name}</span>
                <span>·</span>
                <span>{getTimeAgo(detailRequest.created_at)}</span>
              </div>
            )}

            {/* Description */}
            {editing ? (
              <div className="space-y-3">
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Urgency</Label>
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={editUrgency}
                      onChange={(e) => setEditUrgency(e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reward Credits</Label>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      value={editCredits}
                      onChange={(e) => setEditCredits(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="text-sm whitespace-pre-wrap">{detailRequest.description}</p>
              </div>
            )}

            {/* Actions */}
            {!editing && (
              <div className="space-y-3">
                {/* Owner actions */}
                {isOwner && isOpen && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDelete}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                )}

                {/* Fulfill section */}
                {!isOwner && isOpen && (
                  <div className="space-y-2 border-t border-border/50 pt-3">
                    <p className="text-sm font-medium">Fulfill this request</p>
                    <p className="text-xs text-muted-foreground">
                      Upload a PDF note to earn {detailRequest.reward_credits} credits
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFulfillFile(f);
                      }}
                    />
                    {fulfillFile ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/30">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate flex-1">{fulfillFile.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => setFulfillFile(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" /> Select PDF to upload
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!fulfillFile || fulfilling}
                      onClick={handleFulfill}
                    >
                      {fulfilling ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Fulfill Request
                    </Button>
                  </div>
                )}

                {/* Already fulfilled */}
                {detailRequest.status === "fulfilled" && (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    This request has been fulfilled.
                    {detailRequest.fulfiller && (
                      <span> by {detailRequest.fulfiller.name}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
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
