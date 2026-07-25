import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Auto-create user row in users table
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: existing } = await supabase
            .from("users")
            .select("id")
            .eq("id", user.id)
            .single();

          if (!existing) {
            const name =
              user.user_metadata?.name ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "User";
            const avatar =
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              null;

            await supabase.from("users").insert({
              id: user.id,
              email: user.email || "",
              name,
              avatar,
              credits: 100,
              streak: 0,
            });
          }
        }

        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
