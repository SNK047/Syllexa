"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send, Loader2, Bot, User, Sparkles, Zap, Copy, Check, Plus, MessageSquare, Trash2,
  ChevronLeft, ChevronRight, Camera, Paperclip, Image, FileText, X, AlertTriangle, Video,
} from "lucide-react";

interface Message { role: "user" | "assistant"; content: string; model?: string }
interface ConversationEntry { id: string; title: string; created_at: string; messageCount: number }
interface ModelInfo { id: string; name: string; speed: "fast" | "medium" | "slow"; description: string; contextWindow: number; provider: string }
interface Attachment { id: string; file: File; preview?: string; type: "image" | "video" | "pdf" | "other" }
interface NoteContext { id: string; title: string; content: string }

const SYSTEM_PROMPT = `You are Syllexa AI, an intelligent university study assistant for Indian engineering students.

CORE RULES:
- Always provide ACCURATE, FACTUALLY CORRECT information. Never guess or make up facts.
- If you are unsure, say "I'm not certain — please verify with your textbook."
- For code: provide complete, runnable code with comments.
- For math: show full derivations step by step.
- For definitions: precise definition, then explain simply.
- Use markdown formatting: headers, bold, bullet points, code blocks.
- Subjects: DSA, OS, DBMS, Computer Networks, C/C++/Java/Python, Math, Digital Electronics.

Be helpful, encouraging, and educational.`;

function getSupabase() {
  const { createClient } = require("@/lib/supabase/client");
  return createClient();
}

async function getUser() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function getAttachmentType(file: File): Attachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "other";
}

function getAttachmentIcon(type: Attachment["type"]) {
  switch (type) {
    case "image": return <Image className="h-4 w-4" />;
    case "video": return <Video className="h-4 w-4" />;
    case "pdf": return <FileText className="h-4 w-4" />;
    default: return <Paperclip className="h-4 w-4" />;
  }
}

function AIChatContent() {
  const searchParams = useSearchParams();
  const noteIdParam = searchParams.get("note");

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [noteContext, setNoteContext] = useState<NoteContext | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
  const [imageWarning, setImageWarning] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { loadCredits(); loadHistory(); loadModels(); }, []);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  useEffect(() => {
    if (noteIdParam) loadNoteContext(noteIdParam);
  }, [noteIdParam]);

  async function loadNoteContext(id: string) {
    setNoteLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("notes")
        .select("id, title, content_text")
        .eq("id", id)
        .single();
      if (data && data.content_text) {
        setNoteContext({ id: data.id, title: data.title, content: data.content_text });
        setMessages([{
          role: "assistant",
          content: `I've loaded the note **"${data.title}"** into our chat. Ask me anything about it — I'll reference the note content in my answers.\n\nYou can also attach images, videos, or PDFs using the toolbar below to discuss them.`,
        }]);
      }
    } catch (err) {
      console.error("Failed to load note:", err);
    } finally {
      setNoteLoading(false);
    }
  }

  async function loadModels() {
    try {
      const res = await fetch("/api/ai/chat");
      const data = await res.json();
      const allModels: ModelInfo[] = (data.models || []).map((m: any) => ({
        id: m.id, name: m.name, speed: m.speed, description: m.description,
        contextWindow: m.contextWindow, provider: m.providerName || "Unknown",
      }));
      setModels(allModels);
      if (allModels.length > 0 && !selectedModel) {
        const fast = allModels.find((m) => m.speed === "fast") || allModels[0];
        setSelectedModel(fast.id);
      }
    } catch {
      setModels([{ id: "qwen3.7-flash", name: "Qwen 3.7 Flash", speed: "fast", description: "Fast model", contextWindow: 131072, provider: "Qwen Cloud" }]);
      setSelectedModel("qwen3.7-flash");
    }
  }

  async function loadCredits() {
    try {
      const { ensureUser } = await import("@/actions/ensure-user");
      const user = await ensureUser();
      if (user) setCredits(user.credits || 0);
    } catch {}
  }

  async function loadHistory() {
    try {
      const user = await getUser();
      if (!user) return;
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, messages, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) { console.error("loadHistory error:", error); return; }
      setConversationHistory((data || []).map((c: any) => ({
        id: c.id,
        title: c.messages?.[0]?.role === "user" ? c.messages[0].content.slice(0, 50) : "New conversation",
        created_at: c.created_at,
        messageCount: c.messages?.length || 0,
      })));
    } catch (e) { console.error("loadHistory exception:", e); }
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setNoteContext(null);
  }

  async function loadConversation(id: string) {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, messages")
        .eq("id", id)
        .single();
      if (error) { console.error("loadConversation error:", error); return; }
      if (data) {
        setConversationId(data.id);
        setMessages(data.messages || []);
        setNoteContext(null);
      }
    } catch (e) { console.error("loadConversation exception:", e); }
  }

  async function deleteConversationItem(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
      if (error) { console.error("delete error:", error); return; }
      if (conversationIdRef.current === id) {
        setConversationId(null);
        setMessages([]);
      }
      await loadHistory();
    } catch (e) { console.error("delete exception:", e); }
    setDeletingId(null);
  }

  const saveConversation = useCallback(async (msgs: Message[], existingId: string | null) => {
    if (savingRef.current) return;
    const user = await getUser();
    if (!user || msgs.length === 0) return;
    const supabase = getSupabase();
    if (!supabase) return;

    savingRef.current = true;
    setAutoSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase.from("ai_conversations").update({ messages: msgs }).eq("id", existingId);
        if (error) console.error("update error:", error);
      } else {
        const { data, error } = await supabase.from("ai_conversations").insert({ user_id: user.id, messages: msgs }).select("id").single();
        if (error) { console.error("insert error:", error); return; }
        if (data) {
          setConversationId(data.id);
          conversationIdRef.current = data.id;
        }
      }
      await loadHistory();
    } catch (e) { console.error("save exception:", e); }
    savingRef.current = false;
    setAutoSaving(false);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => { saveConversation(messages, conversationIdRef.current); }, 2000);
    return () => clearTimeout(timer);
  }, [messages, saveConversation]);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  function addAttachment(file: File) {
    const att: Attachment = {
      id: Math.random().toString(36).slice(2),
      file,
      type: getAttachmentType(file),
    };
    if (att.type === "image" || att.type === "video") {
      att.preview = URL.createObjectURL(file);
    }
    setAttachments((prev) => [...prev, att]);
    if (att.type === "image") setImageWarning(true);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  }

  async function startCamera() {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraOpen(false);
    }
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraOpen(false);
  }

  function switchCamera() {
    stopCamera();
    setCameraFacing((prev) => prev === "user" ? "environment" : "user");
    setTimeout(() => startCamera(), 100);
  }

  function capturePhoto() {
    if (!cameraVideoRef.current || !canvasRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        addAttachment(file);
      }
    }, "image/jpeg", 0.9);
    stopCamera();
  }

  async function handleSend() {
    if ((!input.trim() && attachments.length === 0) || loading) return;

    const hasUnsupported = attachments.some((a) => a.type === "image" || a.type === "video");
    let userContent = input.trim();

    if (attachments.length > 0) {
      const attachmentInfo = attachments.map((a) => `[Attached: ${a.file.name} (${a.type})]`).join(" ");
      userContent = userContent ? `${userContent}\n\n${attachmentInfo}` : attachmentInfo;
    }

    if (hasUnsupported && userContent) {
      userContent += "\n\n(Note: I attached files but the AI model cannot process images/videos directly. I've described them in text.)";
    }

    const userMsg: Message = { role: "user", content: userContent };
    const assistantMsg: Message = { role: "assistant", content: "", model: selectedModel };
    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setImageWarning(false);
    setLoading(true);
    const assistantIdx = newMessages.length - 1;

    try {
      const body: any = {
        messages: newMessages
          .filter((m) => m.content && typeof m.content === "string")
          .map((m) => ({ role: m.role, content: m.content })),
        model: selectedModel,
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: SYSTEM_PROMPT,
      };

      if (noteContext) {
        body.noteContext = { title: noteContext.title, content: noteContext.content };
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) fullText += `\n\nError: ${parsed.error}`;
              else if (parsed.text) fullText += parsed.text;
              setMessages((prev) => {
                const u = [...prev];
                if (u[assistantIdx]) u[assistantIdx] = { ...u[assistantIdx], content: fullText };
                return u;
              });
            } catch {}
          }
        }
      }
      if (!fullText) {
        setMessages((prev) => {
          const u = [...prev];
          if (u[assistantIdx]) u[assistantIdx] = { ...u[assistantIdx], content: "No response. Check QWEN_API_KEY is configured." };
          return u;
        });
      }
    } catch (err: any) {
      setMessages((prev) => {
        const u = [...prev];
        if (u[assistantIdx]) u[assistantIdx] = { ...u[assistantIdx], content: `Error: ${err?.message || "Failed"}` };
        return u;
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage(content: string, idx: number) {
    await navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith("image/") || item.type.startsWith("video/") || item.type === "application/pdf") {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) addAttachment(file);
        return;
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* History Sidebar */}
      <div className={`shrink-0 flex flex-col border-r border-border/50 bg-card transition-all duration-200 ${historyOpen ? "w-56" : "w-0 overflow-hidden"}`}>
        <div className="p-2 border-b border-border/50">
          <Button size="sm" className="w-full" onClick={newChat}><Plus className="h-3.5 w-3.5 mr-1" /> New Chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-1.5 space-y-0.5">
            {conversationHistory.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>}
            {conversationHistory.map((c) => (
              <div key={c.id}
                className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg group transition-all ${conversationId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                <button className="flex-1 flex items-start gap-2 text-left min-w-0" onClick={() => loadConversation(c.id)}>
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {c.messageCount} msgs</p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversationItem(c.id); }}
                  disabled={deletingId === c.id}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-50">
                  {deletingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => setHistoryOpen(!historyOpen)} className="shrink-0 w-5 flex items-center justify-center border-r border-border/50 bg-card hover:bg-muted transition-colors">
        {historyOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Chat</h1>
            <p className="text-muted-foreground text-xs">{models.length} models · Qwen Cloud{autoSaving && " · saving..."}</p>
          </div>
          <Badge variant="outline" className="text-xs">{credits} credits</Badge>
        </div>

        {/* Note Context Banner */}
        {noteContext && (
          <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Chatting with note</p>
              <p className="text-sm font-medium truncate">{noteContext.title}</p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => { setNoteContext(null); newChat(); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {noteLoading && (
          <div className="mb-3 p-3 rounded-xl bg-muted flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading note content...</span>
          </div>
        )}

        {/* Model Selector */}
        <div className="mb-3">
          <div className="flex gap-1.5 flex-wrap">
            {models.map((model) => (
              <button key={model.id} onClick={() => setSelectedModel(model.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${selectedModel === model.id ? "bg-primary/10 text-primary border-primary/30 font-medium" : "bg-card text-muted-foreground border-border/50 hover:bg-muted"}`}>
                {model.speed === "fast" ? <Zap className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 rounded-xl border border-border/50 bg-card flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-primary/10">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium mb-1">Chat with Syllexa AI</p>
                  <p className="text-sm text-muted-foreground max-w-md mb-6">
                    {currentModel ? `Using ${currentModel.name}.` : "Select a model."} Ask me anything — DSA, OS, DBMS, Networks, Math, and more.
                    <br />
                    <span className="text-xs mt-2 inline-block">Attach images, videos, or PDFs using the toolbar below.</span>
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Explain binary search trees", "Write a Python merge sort", "TCP vs UDP differences", "What is recursion?"].map((q) => (
                      <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setInput(q); inputRef.current?.focus(); }}>{q}</Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => {
                if (!msg.content && !(loading && i === messages.length - 1)) return null;
                return (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="size-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap relative group ${msg.role === "user" ? "bg-primary text-primary-foreground" : msg.content.startsWith("Error:") ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted"}`}>
                      {msg.content || (loading && i === messages.length - 1 ? (
                        <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</span>
                      ) : null)}
                      {msg.role === "assistant" && msg.content && !msg.content.startsWith("Error:") && (
                        <button onClick={() => copyMessage(msg.content, i)}
                          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-md p-1 shadow-sm">
                          {copiedIdx === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                    {msg.role === "user" && <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="h-4 w-4" /></div>}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {attachments.map((att) => (
              <div key={att.id} className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border/50 text-xs">
                {getAttachmentIcon(att.type)}
                <span className="max-w-[120px] truncate">{att.file.name}</span>
                <button onClick={() => removeAttachment(att.id)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Image Warning */}
        {imageWarning && attachments.some((a) => a.type === "image" || a.type === "video") && (
          <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Qwen Cloud cannot process images or videos directly. Files will be described in text for the AI.</span>
            <button onClick={() => setImageWarning(false)} className="ml-auto"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Input Area */}
        <div className="mt-3">
          {/* Toolbar */}
          <div className="flex items-center gap-1 mb-2">
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) addAttachment(f); e.target.value = ""; }} />
            <input ref={imageInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) addAttachment(f); e.target.value = ""; }} />
            <input ref={videoInputRef} type="file" className="hidden" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) addAttachment(f); e.target.value = ""; }} />

            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()} title="Upload PDF">
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => imageInputRef.current?.click()} title="Upload Image">
              <Image className="h-4 w-4 mr-1" /> Image
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => videoInputRef.current?.click()} title="Upload Video">
              <Video className="h-4 w-4 mr-1" /> Video
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={startCamera} title="Take Photo">
              <Camera className="h-4 w-4 mr-1" /> Camera
            </Button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste}
                placeholder={noteContext ? `Ask about "${noteContext.title}"...` : "Ask Syllexa AI anything about your subjects..."} disabled={loading} rows={1}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[48px] max-h-[120px]"
                style={{ height: "auto" }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
              />
            </div>
            <Button type="submit" size="icon" className="shrink-0 h-12 w-12 rounded-xl" disabled={loading || (!input.trim() && attachments.length === 0)}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
            {currentModel ? `${currentModel.name} · ${(currentModel.contextWindow / 1000).toFixed(0)}K context` : "Select a model"}
            {noteContext && " · Note context active"}
          </p>
        </div>
      </div>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl overflow-hidden max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-semibold flex items-center gap-2"><Camera className="h-5 w-5" /> Take Photo</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={switchCamera}>
                  Switch Camera
                </Button>
                <Button variant="ghost" size="sm" onClick={stopCamera}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="relative bg-black">
              <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full max-h-[400px] object-contain" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex justify-center p-4">
              <Button onClick={capturePhoto} size="lg" className="rounded-full h-14 w-14 p-0">
                <div className="h-10 w-10 rounded-full border-2 border-primary-foreground" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AIChatContent />
    </Suspense>
  );
}
