"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Zap,
  Globe,
  Cpu,
  Heart,
  Link2,
  Copy,
  Check,
  RotateCcw,
  Info,
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
}

interface ConversationEntry {
  id: string;
  title: string;
  created_at: string;
  messageCount: number;
}

interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  isAvailable: boolean;
  modelCount: number;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  speed: "fast" | "medium" | "slow";
  contextWindow: number;
  maxOutput: number;
  supportsImages: boolean;
  supportsCode: boolean;
  description: string;
  pricing: string;
}

const PROVIDER_ICONS: Record<string, any> = {
  openrouter: Globe,
  groq: Zap,
  huggingface: Heart,
  together: Link2,
};

const SPEED_COLORS = {
  fast: "text-green-500",
  medium: "text-yellow-500",
  slow: "text-orange-500",
};

export default function AIChatPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showModelInfo, setShowModelInfo] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    loadProviders();
    loadCredits();
    loadHistory();
  }, []);

  async function loadProviders() {
    try {
      const res = await fetch("/api/ai/chat");
      const data = await res.json();
      setProviders(data.providers || []);
      setAllModels(data.models || []);
      if (data.providers?.length > 0) {
        const available = data.providers.find((p: ProviderInfo) => p.isAvailable) || data.providers[0];
        setSelectedProvider(available.id);
        if (data.models?.length > 0) {
          const providerModels = data.models.filter((m: ModelInfo) => m.provider === available.id);
          if (providerModels.length > 0) setSelectedModel(providerModels[0].id);
        }
      }
    } catch {}
  }

  async function loadCredits() {
    try {
      const { ensureUser } = await import("@/actions/ensure-user");
      const user = await ensureUser();
      if (user) setCredits(user.credits || 0);
    } catch {}
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const { getUserConversations } = await import("@/actions/conversations");
      const convs = await getUserConversations();
      setConversationHistory(
        convs.map((c) => ({
          id: c.id,
          title: getTitleFromMessages(c.messages),
          created_at: c.created_at,
          messageCount: c.messages.length,
        }))
      );
    } catch {}
    setHistoryLoading(false);
  }

  function getTitleFromMessages(msgs: { role: string; content: string }[]): string {
    const firstUser = msgs.find((m) => m.role === "user");
    if (!firstUser) return "New conversation";
    const text = firstUser.content.slice(0, 50);
    return text.length < firstUser.content.length ? text + "..." : text;
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
  }

  async function loadConversation(id: string) {
    try {
      const { getConversation } = await import("@/actions/conversations");
      const conv = await getConversation(id);
      if (conv) {
        setConversationId(conv.id);
        setMessages(conv.messages as Message[]);
      }
    } catch {}
  }

  async function deleteConversationItem(id: string) {
    try {
      const { deleteConversation } = await import("@/actions/conversations");
      await deleteConversation(id);
      if (conversationId === id) newChat();
      await loadHistory();
    } catch {}
  }

  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const { saveConversation } = await import("@/actions/conversations");
        const newId = await saveConversation(conversationId, messages);
        if (newId && !conversationId) setConversationId(newId);
        await loadHistory();
      } catch {}
      setAutoSaving(false);
    }, 1500);
  }

  useEffect(() => {
    if (messages.length > 0) scheduleSave();
  }, [messages]);

  const currentModel = allModels.find(
    (m) => m.provider === selectedProvider && m.id === selectedModel
  );
  const providerModels = allModels.filter((m) => m.provider === selectedProvider);

  function handleProviderChange(providerId: string) {
    setSelectedProvider(providerId);
    const models = allModels.filter((m) => m.provider === providerId);
    if (models.length > 0) setSelectedModel(models[0].id);
  }

  async function handleSend() {
    if (!input.trim() || loading || !selectedProvider || !selectedModel) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", provider: selectedProvider, model: selectedModel },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          provider: selectedProvider,
          model: selectedModel,
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: `You are Syllexa AI, an intelligent university study assistant for Indian engineering students.

CORE RULES:
- Always provide ACCURATE, FACTUALLY CORRECT information. Never guess or make up facts.
- If you are unsure about something, say "I'm not certain about this — please verify with your textbook."
- Use your training knowledge to answer. Do NOT claim to look things up or access the internet.
- When explaining concepts, use step-by-step breakdowns with examples.
- For code: provide complete, runnable code with comments explaining each part.
- For math: show the full derivation step by step.
- For definitions: give a precise 1-2 line definition, then explain in simple terms.
- Use markdown formatting: headers, bold, bullet points, code blocks, LaTeX for math.
- Relate concepts to real-world applications when possible.
- If the question is about a specific Indian university syllabus, provide content relevant to Anna University / VTU / JNTU / Mumbai University patterns.

SUBJECTS YOU EXCEL AT:
- Computer Science: Data Structures, Algorithms, OS, DBMS, Computer Networks, Compiler Design, Theory of Computation, Software Engineering
- Programming: C, C++, Java, Python, JavaScript, SQL, HTML/CSS
- Electronics: Digital Electronics, Signals & Systems, VLSI, Communication Systems
- Math: Linear Algebra, Calculus, Probability, Statistics, Discrete Math
- Core Engineering: Thermodynamics, Fluid Mechanics, Circuit Analysis

Be helpful, encouraging, and educational. Students are here to learn — help them understand, not just memorize.`,
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
              if (parsed.error) {
                fullText += `\n\nError: ${parsed.error}`;
              } else if (parsed.text) {
                fullText += parsed.text;
              }
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIdx] = { ...updated[assistantIdx], content: fullText };
                return updated;
              });
            } catch {}
          }
        }
      }

      if (!fullText) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIdx] = { ...updated[assistantIdx], content: "No response received. Please check your API key and try again." };
          return updated;
        });
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = { ...updated[assistantIdx], content: `Error: ${err?.message || "Failed to get response"}` };
        return updated;
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const availableCount = providers.filter((p) => p.isAvailable).length;

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* History Sidebar */}
      <div className={`shrink-0 flex flex-col border-r border-border/50 bg-card transition-all duration-200 ${historyOpen ? "w-56" : "w-0 overflow-hidden"}`}>
        <div className="p-2 border-b border-border/50">
          <Button size="sm" className="w-full" onClick={newChat}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {historyLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!historyLoading && conversationHistory.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            )}
            {conversationHistory.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left group transition-all ${
                  conversationId === c.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {" "}&middot; {c.messageCount} msgs
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversationItem(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Toggle History Button */}
      <button
        onClick={() => setHistoryOpen(!historyOpen)}
        className="shrink-0 w-5 flex items-center justify-center border-r border-border/50 bg-card hover:bg-muted transition-colors"
      >
        {historyOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Chat
            </h1>
            <p className="text-muted-foreground text-xs">
              {availableCount} provider{availableCount !== 1 ? "s" : ""} &middot; {allModels.length} models
              {autoSaving && <span className="ml-2 text-muted-foreground/50">saving...</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{credits} credits</Badge>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Providers & Models Sidebar */}
          <div className="w-52 shrink-0 flex flex-col gap-3">
            <div className="rounded-xl border border-border/50 bg-card p-2.5 space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1">PROVIDERS</p>
              {providers.map((provider) => {
                const Icon = PROVIDER_ICONS[provider.id] || Cpu;
                const isActive = selectedProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderChange(provider.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left ${
                      isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    } ${!provider.isAvailable ? "opacity-50" : ""}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" style={isActive ? { color: provider.color } : {}} />
                    <span className="flex-1 truncate">{provider.name}</span>
                    <div
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: provider.isAvailable ? "#22c55e" : "#a3a3a3" }}
                    />
                  </button>
                );
              })}
            </div>

            {providerModels.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-2.5 space-y-0.5">
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1">MODELS</p>
                {providerModels.map((model) => {
                  const isActive = selectedModel === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left ${
                        isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="flex-1 truncate">{model.name}</span>
                      <span className={`text-[10px] ${SPEED_COLORS[model.speed]}`}>
                        {model.speed === "fast" ? "●●●" : model.speed === "medium" ? "●●○" : "●○○"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentModel && (
              <div className="rounded-xl border border-border/50 bg-card p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-muted-foreground">MODEL</p>
                  <button onClick={() => setShowModelInfo(!showModelInfo)}>
                    <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                <p className="text-xs font-medium">{currentModel.name}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{currentModel.description}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {currentModel.contextWindow >= 1000000
                      ? `${(currentModel.contextWindow / 1000000).toFixed(0)}M`
                      : `${(currentModel.contextWindow / 1000).toFixed(0)}K`} ctx
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">{currentModel.speed}</Badge>
                  {currentModel.supportsImages && <Badge variant="secondary" className="text-[10px]">Vision</Badge>}
                  {currentModel.supportsCode && <Badge variant="secondary" className="text-[10px]">Code</Badge>}
                  <Badge variant="outline" className="text-[10px]">{currentModel.pricing}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 rounded-xl border border-border/50 bg-card flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      {selectedProvider ? (
                        (() => {
                          const Icon = PROVIDER_ICONS[selectedProvider] || Bot;
                          const prov = providers.find((p) => p.id === selectedProvider);
                          return (
                            <>
                              <div
                                className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                                style={{ backgroundColor: `${prov?.color}15` }}
                              >
                                <Icon className="h-8 w-8" style={{ color: prov?.color }} />
                              </div>
                              <p className="text-lg font-medium mb-1">Chat with {prov?.name || "AI"}</p>
                              <p className="text-sm text-muted-foreground max-w-md mb-6">
                                Using {currentModel?.name || "AI model"}. Ask me anything about your subjects!
                              </p>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
                          <p className="text-lg font-medium mb-1">Welcome to AI Chat</p>
                          <p className="text-sm text-muted-foreground mb-2">Select a provider to get started.</p>
                        </>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {["Explain binary search trees", "Write a Python merge sort", "TCP vs UDP differences", "What is recursion?"].map((q) => (
                          <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setInput(q); inputRef.current?.focus(); }}>
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div
                          className="size-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${providers.find((p) => p.id === msg.provider)?.color || "#666"}15` }}
                        >
                          <Bot className="h-4 w-4" style={{ color: providers.find((p) => p.id === msg.provider)?.color }} />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap relative group ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : msg.content.startsWith("Error:")
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-muted"
                        }`}
                      >
                        {msg.content || (loading && i === messages.length - 1 ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                          </span>
                        ) : null)}
                        {msg.role === "assistant" && msg.content && (
                          <button
                            onClick={() => copyMessage(msg.content, i)}
                            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-md p-1 shadow-sm"
                          >
                            {copiedIdx === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                        {msg.role === "assistant" && msg.model && (
                          <div className="mt-2 pt-2 border-t border-border/30">
                            <span className="text-[10px] text-muted-foreground">
                              {providers.find((p) => p.id === msg.provider)?.name} &middot;{" "}
                              {allModels.find((m) => m.id === msg.model)?.name || msg.model}
                            </span>
                          </div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
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
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedProvider ? `Ask ${providers.find((p) => p.id === selectedProvider)?.name || "AI"} anything...` : "Select a provider first..."}
                    disabled={loading || !selectedProvider}
                    rows={1}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[48px] max-h-[120px]"
                    style={{ height: "auto" }}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 120) + "px";
                    }}
                  />
                </div>
                <Button type="submit" size="icon" className="shrink-0 h-12 w-12 rounded-xl" disabled={loading || !input.trim() || !selectedProvider}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
              {selectedProvider && currentModel && (
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                  {currentModel.name} &middot; {currentModel.contextWindow >= 1000000 ? `${(currentModel.contextWindow / 1000000).toFixed(0)}M` : `${(currentModel.contextWindow / 1000).toFixed(0)}K`} ctx &middot; {currentModel.pricing}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
