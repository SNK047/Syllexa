"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send, Loader2, Bot, User, Sparkles, Zap, Copy, Check, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";

interface Message { role: "user" | "assistant"; content: string; model?: string }
interface ConversationEntry { id: string; title: string; created_at: string; messageCount: number }
interface ModelInfo { id: string; name: string; speed: "fast" | "medium" | "slow"; description: string; contextWindow: number }

const MODELS: ModelInfo[] = [
  { id: "gpt-oss:120b", name: "GPT-OSS 120B", speed: "medium", description: "Best general-purpose model", contextWindow: 131072 },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", speed: "medium", description: "Excellent for reasoning & math", contextWindow: 131072 },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", speed: "fast", description: "Fast with good accuracy", contextWindow: 131072 },
  { id: "qwen3.5:397b", name: "Qwen 3.5 397B", speed: "slow", description: "Massive 397B, best for complex tasks", contextWindow: 131072 },
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", speed: "medium", description: "Best for programming", contextWindow: 131072 },
  { id: "kimi-k2.6", name: "Kimi K2.6", speed: "medium", description: "Strong reasoning", contextWindow: 131072 },
  { id: "gpt-oss:20b", name: "GPT-OSS 20B", speed: "fast", description: "Lightweight, fast responses", contextWindow: 131072 },
  { id: "nemotron-3-ultra", name: "Nemotron 3 Ultra", speed: "medium", description: "NVIDIA's deep reasoning model", contextWindow: 131072 },
  { id: "mistral-large-3:675b", name: "Mistral Large 3", speed: "slow", description: "675B, excellent multilingual", contextWindow: 131072 },
  { id: "glm-5.2", name: "GLM 5.2", speed: "medium", description: "Zhipu AI, strong at reasoning", contextWindow: 131072 },
];

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

export default function AIChatPage() {
  const [selectedModel, setSelectedModel] = useState("gpt-oss:20b");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { loadCredits(); loadHistory(); }, []);

  async function loadCredits() {
    try {
      const { ensureUser } = await import("@/actions/ensure-user");
      const user = await ensureUser();
      if (user) setCredits(user.credits || 0);
    } catch {}
  }

  async function loadHistory() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("ai_conversations").select("id, messages, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      setConversationHistory((data || []).map((c: any) => ({
        id: c.id,
        title: c.messages?.[0]?.role === "user" ? c.messages[0].content.slice(0, 50) : "New conversation",
        created_at: c.created_at,
        messageCount: c.messages?.length || 0,
      })));
    } catch {}
  }

  function newChat() { setConversationId(null); setMessages([]); setInput(""); }

  async function loadConversation(id: string) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.from("ai_conversations").select("id, messages").eq("id", id).single();
      if (data) { setConversationId(data.id); setMessages(data.messages || []); }
    } catch {}
  }

  async function deleteConversationItem(id: string) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("ai_conversations").delete().eq("id", id);
      if (conversationId === id) newChat();
      await loadHistory();
    } catch {}
  }

  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && messages.length > 0) {
          if (conversationId) {
            await supabase.from("ai_conversations").update({ messages }).eq("id", conversationId);
          } else {
            const { data } = await supabase.from("ai_conversations").insert({ user_id: user.id, messages }).select("id").single();
            if (data) setConversationId(data.id);
          }
          await loadHistory();
        }
      } catch {}
      setAutoSaving(false);
    }, 1500);
  }

  useEffect(() => { if (messages.length > 0) scheduleSave(); }, [messages]);

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    const assistantIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "", model: selectedModel }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: SYSTEM_PROMPT,
        }),
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
              setMessages((prev) => { const u = [...prev]; u[assistantIdx] = { ...u[assistantIdx], content: fullText }; return u; });
            } catch {}
          }
        }
      }
      if (!fullText) {
        setMessages((prev) => { const u = [...prev]; u[assistantIdx] = { ...u[assistantIdx], content: "No response. Check OLLAMA_API_KEY is configured." }; return u; });
      }
    } catch (err: any) {
      setMessages((prev) => { const u = [...prev]; u[assistantIdx] = { ...u[assistantIdx], content: `Error: ${err?.message || "Failed"}` }; return u; });
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
              <button key={c.id} onClick={() => loadConversation(c.id)}
                className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left group transition-all ${conversationId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} &middot; {c.messageCount} msgs</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteConversationItem(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
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
            <p className="text-muted-foreground text-xs">Powered by Ollama Cloud &middot; 10 models{autoSaving && " &middot; saving..."}</p>
          </div>
          <Badge variant="outline" className="text-xs">{credits} credits</Badge>
        </div>

        {/* Model Selector */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {MODELS.map((model) => (
            <button key={model.id} onClick={() => setSelectedModel(model.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${selectedModel === model.id ? "bg-primary/10 text-primary border-primary/30 font-medium" : "bg-card text-muted-foreground border-border/50 hover:bg-muted"}`}>
              {model.speed === "fast" ? <Zap className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              {model.name}
            </button>
          ))}
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
                    Using {currentModel.name}. Ask me anything — DSA, OS, DBMS, Networks, Math, and more.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Explain binary search trees", "Write a Python merge sort", "TCP vs UDP differences", "What is recursion?"].map((q) => (
                      <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setInput(q); inputRef.current?.focus(); }}>{q}</Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
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
                    {msg.role === "assistant" && msg.content && (
                      <button onClick={() => copyMessage(msg.content, i)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-md p-1 shadow-sm">
                        {copiedIdx === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                  {msg.role === "user" && <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="h-4 w-4" /></div>}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="mt-3">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask Syllexa AI anything about your subjects..." disabled={loading} rows={1}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[48px] max-h-[120px]"
                style={{ height: "auto" }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
              />
            </div>
            <Button type="submit" size="icon" className="shrink-0 h-12 w-12 rounded-xl" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">{currentModel.name} &middot; {(currentModel.contextWindow / 1000).toFixed(0)}K context &middot; Pay-per-use</p>
        </div>
      </div>
    </div>
  );
}
