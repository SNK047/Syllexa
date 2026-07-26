import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Award, Upload, Brain, Trophy } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logox.jpg" alt="Syllexa" className="h-8 w-8 rounded" />
            <span className="text-xl font-bold">Syllexa</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            AI-Powered Learning
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            The notes you need.
            <br />
            <span className="text-primary">Instantly.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Upload, discover, and chat with study notes powered by AI. Built for
            university students who want to learn smarter.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="px-8">
                Start Free
              </Button>
            </Link>
            <Link href="/explore">
              <Button size="lg" variant="outline" className="px-8">
                Explore Notes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-muted/30 px-4 py-20">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything you need to ace your exams
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Upload className="h-6 w-6" />}
              title="Upload & Share"
              description="Share your notes with classmates. OCR processing makes every document searchable."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="AI Chat"
              description="Ask questions about any note. Get summaries, flashcards, and quiz questions instantly."
            />
            <FeatureCard
              icon={<Award className="h-6 w-6" />}
              title="Earn Credits"
              description="Upload notes, fulfill requests, and climb the leaderboard. Learning pays off."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>&copy; 2026 Syllexa</span>
          <span>Built for students, by students</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3">
      <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
