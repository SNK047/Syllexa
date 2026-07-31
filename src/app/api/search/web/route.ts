import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      body: new URLSearchParams({
        q: query,
        kl: "us-en",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error("DuckDuckGo search error:", res.status);
      return NextResponse.json({ results: [], error: "Search request failed" });
    }

    const html = await res.text();

    const results = parseDuckDuckGoHtml(html).slice(0, 10);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("DuckDuckGo search error:", err);
    return NextResponse.json({ results: [], error: "Search request failed" });
  }
}

function parseDuckDuckGoHtml(html: string) {
  const results: { title: string; link: string; snippet: string; source: string }[] = [];

  const resultBlocks = html.split('class="result');

  for (const block of resultBlocks.slice(1)) {
    try {
      const linkMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/);
      const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/);

      if (!linkMatch) continue;

      let link = linkMatch[1];
      if (link.startsWith("//")) link = "https:" + link;

      const title = stripHtml(linkMatch[2]).trim() || link;
      const snippet = snippetMatch ? stripHtml(snippetMatch[1]).trim() : "";

      let source = "";
      try {
        source = new URL(link).hostname.replace("www.", "");
      } catch {}

      results.push({ title, link, snippet, source });
    } catch {
      continue;
    }
  }

  return results;
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
