"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Search,
  Upload,
  FileText,
  Trophy,
  Bell,
  Bookmark,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  Coins,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore", label: "Explore Notes", icon: Search },
  { href: "/upload", label: "Upload Notes", icon: Upload },
  { href: "/requests", label: "Requests", icon: FileText },
  { href: "/ai-chat", label: "AI Chat", icon: Sparkles },
];

const bottomNavItems = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userCredits, setUserCredits] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [popularSubjects, setPopularSubjects] = useState<{ id: string; name: string; code: string }[]>([]);

  useEffect(() => {
    setMounted(true);
    async function loadUser() {
      try {
        const { ensureUser } = await import("@/actions/ensure-user");
        const userData = await ensureUser();
        if (userData) {
          setUserName(userData.name || "User");
          setUserCredits(userData.credits || 0);

          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          if (supabase) {
            const { count } = await supabase
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userData.id)
              .eq("read", false);
            setUnreadCount(count || 0);

            const { data: subjects } = await supabase
              .from("subjects")
              .select("id, name, code")
              .order("name")
              .limit(6);
            setPopularSubjects(subjects || []);
          }
        }
      } catch {
        // Supabase not configured
      }
    }
    loadUser();
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  function handleSubjectClick(subjectId: string) {
    router.push(`/explore?subject=${subjectId}`);
  }

  async function handleLogout() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Supabase not configured
    }
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-border/50 bg-sidebar">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-border/50">
          <img src="/logox.jpg" alt="Syllexa" className="h-7 w-7 rounded" />
          <span className="text-lg font-bold">Syllexa</span>
        </div>

        <nav className="px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Search Block */}
        <div className="px-3 pb-2">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Search Web
            </p>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notes & web..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md bg-background pl-8 pr-2.5 py-1.5 text-xs border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                />
              </div>
            </form>
            {popularSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {popularSubjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSubjectClick(s.id)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-3 pb-2 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.label === "Notifications" && unreadCount > 0 && (
                  <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{userCredits} credits</span>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="flex items-center justify-between h-16 px-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex items-center gap-2 px-6 h-16 border-b border-border/50">
                <img src="/logox.jpg" alt="Syllexa" className="h-7 w-7 rounded" />
                <span className="text-lg font-bold">Syllexa</span>
              </div>
              <nav className="px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.label === "Notifications" && unreadCount > 0 && (
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 lg:hidden">
            <img src="/logox.jpg" alt="Syllexa" className="h-6 w-6 rounded" />
            <span className="font-bold">Syllexa</span>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{userCredits}</span>
            </div>

            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">
                      Student
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/profile" />}>
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
