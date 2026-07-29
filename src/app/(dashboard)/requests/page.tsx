"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  Search,
  Filter,
  Eye,
  User,
  MessageSquare,
  Zap,
  ArrowUpDown,
} from "lucide-react";

interface Request {
  id: string;
  description: string;
  urgency: string;
  reward_credits: number;
  status: string;
  created_at: string;
  user_id: string;
  subject_id: string;
  unit_id: string;
  fulfilled_by: string | null;
  note_id: string | null;
  users: { id: string; name: string; avatar: string | null } | null;
  subjects: { id: string; name: string; code: string } | null;
  units: { id: string; number: number; title: string } | null;
  fulfiller: { id: string; name: string } | null;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("open");
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Detail panel
  const [detailRequest, setDetailRequest] = useState<Request | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editUrgency, setEditUrgency] = useState("normal");
  const [editCredits, setEditCredits] = useState(10);

  // Fulfill
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fulfillFile, setFulfillFile] = useState<File | null>(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [fulfillError, setFulfillError] = useState("");

  // Stats
  const [stats, setStats] = useState({ open: 0, fulfilled: 0, myRequests: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ getAllRequests, getRequestStats }] = await Promise.all([
        import("@/actions/requests"),
      ]);
      const [result, statsResult] = await Promise.all([
        getAllRequests(100),
        getRequestStats(currentUser?.id),
      ]);
      if (result.data) setRequests(result.data);
      setStats(statsResult);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadUser() {
    const { ensureUser } = await import("@/actions/ensure-user");
    const user = await ensureUser();
    setCurrentUser(user);
  }

  const filteredRequests = requests.filter((r) => {
    if (activeTab === "open" && r.status !== "open") return false;
    if (activeTab === "fulfilled" && r.status !== "fulfilled") return false;
    if (activeTab === "mine" && r.user_id !== currentUser?.id) return false;
    if (urgencyFilter !== "all" && r.urgency !== urgencyFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const desc = r.description?.toLowerCase() || "";
      const code = r.subjects?.code?.toLowerCase() || "";
      const name = r.subjects?.name?.toLowerCase() || "";
      const unit = `unit ${r.units?.number}`.toLowerCase();
      if (!desc.includes(q) && !code.includes(q) && !name.includes(q) && !unit.includes(q)) return false;
    }
    return true;
  });

  const openCounts = {
    all: requests.filter((r) => r.status === "open").length,
    mine: requests.filter((r) => r.user_id === currentUser?.id).length,
    fulfilled: requests.filter((r) => r.status === "fulfilled").length,
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hierarchy.unitId || !description.trim()) {
      setCreateError("Please select subject and enter description");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const { createRequest } = await import("@/actions/requests");
      const { error } = await createRequest({
        subject_id: hierarchy.subjectId,
        unit_id: hierarchy.unitId,
        description,
        urgency,
        reward_credits: rewardCredits,
      });
      if (error) {
        setCreateError(error);
        return;
      }
      setCreateOpen(false);
      resetCreateForm();
      loadData();
    } catch {
      setCreateError("Failed to create request");
    } finally {
      setCreating(false);
    }
  }

  function resetCreateForm() {
    setDescription("");
    setUrgency("normal");
    setRewardCredits(10);
    setHierarchy({ universityId: "", departmentId: "", semesterId: "", subjectId: "", unitId: "" });
    setCreateError("");
  }

  async function openDetail(request: Request) {
    setDetailRequest(request);
    setEditing(false);
    setFulfillFile(null);
    setFulfillError("");
    setEditDescription(request.description);
    setEditUrgency(request.urgency);
    setEditCredits(request.reward_credits);
  }

  async function refreshDetail(requestId: string) {
    setDetailLoading(true);
    try {
      const { getRequest } = await import("@/actions/requests");
      const { data } = await getRequest(requestId);
      if (data) {
        setDetailRequest(data);
        setEditDescription(data.description);
        setEditUrgency(data.urgency);
        setEditCredits(data.reward_credits);
      }
    } catch (e) { console.error("refreshDetail error:", e); }
    setDetailLoading(false);
  }

  async function handleSaveEdit() {
    if (!detailRequest) return;
    setCreating(true);
    const { updateRequest } = await import("@/actions/requests");
    const { error } = await updateRequest(detailRequest.id, {
      description: editDescription,
      urgency: editUrgency,
      reward_credits: editCredits,
    });
    if (!error) {
      setEditing(false);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === detailRequest.id
            ? { ...r, description: editDescription, urgency: editUrgency, reward_credits: editCredits }
            : r
        )
      );
      setDetailRequest((prev) =>
        prev ? { ...prev, description: editDescription, urgency: editUrgency, reward_credits: editCredits } : prev
      );
    }
    setCreating(false);
  }

  async function handleFulfill() {
    if (!detailRequest || !fulfillFile) return;
    setFulfilling(true);
    setFulfillError("");
    try {
      let contentText = "";
      try {
        const { extractTextFromPDF } = await import("@/lib/pdf-extract");
        contentText = await extractTextFromPDF(fulfillFile);
      } catch {}

      const { uploadFile } = await import("@/actions/upload");
      const fileExt = fulfillFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const uploadResult = await uploadFile(fulfillFile, filePath);
      if (uploadResult.error) {
        setFulfillError(uploadResult.error);
        return;
      }

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
        setFulfillError(noteResult.error);
        return;
      }

      const { fulfillRequest } = await import("@/actions/requests");
      const { error: fulfillError } = await fulfillRequest(detailRequest.id, noteResult.data.id);
      if (fulfillError) {
        setFulfillError(fulfillError);
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === detailRequest.id
            ? { ...r, status: "fulfilled", fulfilled_by: currentUser?.id, note_id: noteResult.data.id }
            : r
        )
      );
      setDetailRequest(null);
      setFulfillFile(null);
      loadData();
    } catch {
      setFulfillError("Failed to fulfill request");
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
      {/* Header + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Note Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ask for notes, earn credits by fulfilling requests</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Note Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              {createError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{createError}</div>
              )}
              <div className="space-y-2">
                <Label>Subject & Unit *</Label>
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
              <DialogFooter>
                <Button type="submit" disabled={creating || !hierarchy.unitId}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Publish Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.open}</div>
          <div className="text-xs text-muted-foreground mt-1">Open Requests</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{stats.fulfilled}</div>
          <div className="text-xs text-muted-foreground mt-1">Fulfilled</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{stats.myRequests}</div>
          <div className="text-xs text-muted-foreground mt-1">My Requests</div>
        </div>
      </div>

      {/* Tabs + Search + Filters */}
      <div className="space-y-3">
        <Tabs defaultValue="open" onValueChange={(val) => setActiveTab(val as string)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList variant="line">
              <TabsTrigger value="open" className="gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Open
                {openCounts.all > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{openCounts.all}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="mine" className="gap-1.5">
                <User className="h-3.5 w-3.5" />
                My Requests
              </TabsTrigger>
              <TabsTrigger value="fulfilled" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Fulfilled
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1.5">
                All
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm h-9"
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
              >
                <option value="all">All urgency</option>
                <option value="urgent">Urgent only</option>
                <option value="normal">Normal only</option>
              </select>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-16 text-center">
          <FileText className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground/70 mb-2">
            {search || urgencyFilter !== "all" ? "No matching requests" : "No requests yet"}
          </p>
          <p className="text-sm text-muted-foreground/50 mb-4">
            {search || urgencyFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Be the first to request notes from the community!"}
          </p>
          {!search && urgencyFilter === "all" && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Request
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              currentUserId={currentUser?.id}
              onClick={() => openDetail(request)}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailRequest} onOpenChange={(open) => { if (!open) setDetailRequest(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detailRequest.status === "fulfilled" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                  {editing ? "Edit Request" : "Request Details"}
                </DialogTitle>
              </DialogHeader>

              {/* Meta badges */}
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
                  <span>Requested by <strong>{detailRequest.users.name}</strong></span>
                  <span className="text-muted-foreground/50">&middot;</span>
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
                    <Button size="sm" onClick={handleSaveEdit} disabled={creating}>
                      {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Save Changes
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{detailRequest.description}</p>
                </div>
              )}

              {/* Fulfill error */}
              {fulfillError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{fulfillError}</div>
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
                    <div className="space-y-3 border-t border-border/50 pt-3">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Fulfill this request</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload a PDF note to earn <strong className="text-yellow-500">{detailRequest.reward_credits} credits</strong>
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
                        {fulfilling ? "Uploading & Fulfilling..." : "Fulfill Request"}
                      </Button>
                    </div>
                  )}

                  {/* Already fulfilled */}
                  {detailRequest.status === "fulfilled" && (
                    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      This request has been fulfilled.
                      {detailRequest.fulfiller && (
                        <span> by <strong>{detailRequest.fulfiller.name}</strong></span>
                      )}
                    </div>
                  )}

                  {/* Link to fulfilled note */}
                  {detailRequest.status === "fulfilled" && detailRequest.note_id && (
                    <Button size="sm" variant="outline" className="w-full" render={<a href={`/notes/${detailRequest.note_id}`} />}>
                      <Eye className="h-3 w-3 mr-1" /> View Fulfilled Note
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({
  request,
  currentUserId,
  onClick,
}: {
  request: Request;
  currentUserId?: string;
  onClick: () => void;
}) {
  const isOwn = currentUserId === request.user_id;
  const isOpen = request.status === "open";

  return (
    <Card
      className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Top row: badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {request.subjects?.code && (
              <Badge variant="secondary" className="text-xs font-mono">{request.subjects.code}</Badge>
            )}
            {request.units?.number && (
              <span className="text-muted-foreground text-xs">Unit {request.units.number}</span>
            )}
          </div>
          <Badge
            variant={isOpen ? "default" : "secondary"}
            className="text-[10px] shrink-0"
          >
            {isOpen ? "Open" : "Done"}
          </Badge>
        </div>

        {/* Urgency + Credits */}
        <div className="flex items-center gap-2">
          {request.urgency === "urgent" && (
            <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Urgent
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
            <Coins className="h-2.5 w-2.5 text-yellow-500" /> {request.reward_credits} credits
          </Badge>
          {isOwn && (
            <Badge variant="outline" className="text-[10px]">Yours</Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm line-clamp-3 flex-1">{request.description}</p>

        {/* Bottom row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {getTimeAgo(request.created_at)}
          </span>
          {request.users && (
            <span className="flex items-center gap-1">
              <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                {request.users.name?.[0]?.toUpperCase()}
              </div>
              {request.users.name?.split(" ")[0]}
            </span>
          )}
        </div>
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
