import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    return NextResponse.json({ results: [], error: "Search API not configured" });
  }

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", "8");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Google Search API error:", res.status, errText);
      return NextResponse.json({ results: [], error: "Search API request failed" });
    }

    const data = await res.json();

    const results = (data.items || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: item.displayLink,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Web search error:", err);
    return NextResponse.json({ results: [], error: "Search request failed" });
  }
}
