"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Lightbulb, FileText, Sparkles } from "lucide-react";

interface AIToolsProps {
  noteId: string;
  noteTitle: string;
}

type Tab = "flashcards" | "quiz" | "summary" | "keywords";

export function AITools({ noteId, noteTitle }: AIToolsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function loadTool(tool: Tab) {
    setActiveTab(tool);
    setLoading(true);
    setResult(null);

    try {
      if (tool === "flashcards") {
        const { createFlashcards } = await import("@/actions/ai-tools");
        const { data, error } = await createFlashcards(noteId, 8);
        if (error) setResult({ error });
        else setResult({ flashcards: data });
      } else if (tool === "quiz") {
        const { createQuiz } = await import("@/actions/ai-tools");
        const { data, error } = await createQuiz(noteId, 5);
        if (error) setResult({ error });
        else setResult({ quiz: data });
      } else if (tool === "summary") {
        const { createSummary } = await import("@/actions/ai-tools");
        const { data, error } = await createSummary(noteId, "exam");
        if (error) setResult({ error });
        else setResult({ summary: data });
      } else if (tool === "keywords") {
        const { extractKeywords } = await import("@/actions/ai-tools");
        const { data, error } = await extractKeywords(noteId);
        if (error) setResult({ error });
        else setResult({ keywords: data });
      }
    } catch {
      setResult({ error: "Failed to generate" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tool Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === "summary" ? "default" : "outline"}
            size="sm"
            onClick={() => loadTool("summary")}
          >
            <FileText className="h-3 w-3 mr-1" />
            Summary
          </Button>
          <Button
            variant={activeTab === "flashcards" ? "default" : "outline"}
            size="sm"
            onClick={() => loadTool("flashcards")}
          >
            <Brain className="h-3 w-3 mr-1" />
            Flashcards
          </Button>
          <Button
            variant={activeTab === "quiz" ? "default" : "outline"}
            size="sm"
            onClick={() => loadTool("quiz")}
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            Quiz
          </Button>
          <Button
            variant={activeTab === "keywords" ? "default" : "outline"}
            size="sm"
            onClick={() => loadTool("keywords")}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Keywords
          </Button>
        </div>

        {/* Result */}
        {loading && (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Generating {activeTab}...</span>
          </div>
        )}

        {result?.error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {result.error}
          </div>
        )}

        {result?.summary && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm">{result.summary}</p>
          </div>
        )}

        {result?.flashcards && (
          <div className="space-y-3">
            {result.flashcards.map((card: any, i: number) => (
              <Flashcard key={i} card={card} index={i} />
            ))}
          </div>
        )}

        {result?.quiz && (
          <div className="space-y-4">
            {result.quiz.map((q: any, i: number) => (
              <QuizQuestion key={i} question={q} index={i} />
            ))}
          </div>
        )}

        {result?.keywords && (
          <div className="flex flex-wrap gap-2">
            {result.keywords.map((kw: string, i: number) => (
              <Badge key={i} variant="secondary">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {!loading && !result && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Click a tool to generate AI-powered content for this note.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Flashcard({ card, index }: { card: any; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const difficultyColor =
    card.difficulty === "easy"
      ? "text-green-500"
      : card.difficulty === "hard"
      ? "text-red-500"
      : "text-yellow-500";

  return (
    <div
      className="rounded-lg border border-border/50 p-4 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => setFlipped(!flipped)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs text-muted-foreground">#{index + 1}</span>
        <Badge variant="outline" className={`text-xs ${difficultyColor}`}>
          {card.difficulty}
        </Badge>
      </div>
      <p className="text-sm font-medium">
        {flipped ? card.answer : card.question}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        {flipped ? "Click to see question" : "Click to reveal answer"}
      </p>
    </div>
  );
}

function QuizQuestion({ question, index }: { question: any; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const showResult = selected !== null;

  return (
    <div className="rounded-lg border border-border/50 p-4 space-y-3">
      <p className="text-sm font-medium">
        {index + 1}. {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((opt: string, i: number) => {
          const isCorrect = i === question.correct;
          const isSelected = i === selected;
          let className = "w-full text-left text-sm p-2 rounded-lg border transition-colors ";
          if (showResult && isCorrect) {
            className += "border-green-500 bg-green-500/10 text-green-600";
          } else if (showResult && isSelected && !isCorrect) {
            className += "border-red-500 bg-red-500/10 text-red-600";
          } else {
            className += "border-border/50 hover:border-primary/50";
          }

          return (
            <button
              key={i}
              className={className}
              onClick={() => !showResult && setSelected(i)}
              disabled={showResult}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showResult && question.explanation && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
          {question.explanation}
        </p>
      )}
    </div>
  );
}
