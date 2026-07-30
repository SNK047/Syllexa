import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL("https://api.duckduckgo.com/");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("no_html", "1");
    url.searchParams.set("skip_disambig", "1");
    url.searchParams.set("t", "syllexa");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      console.error("DuckDuckGo API error:", res.status);
      return NextResponse.json({ results: [], error: "Search request failed" });
    }

    const data = await res.json();

    const results: { title: string; link: string; snippet: string; source: string }[] = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || data.AbstractSource || "Summary",
        link: data.AbstractURL,
        snippet: data.AbstractText.slice(0, 300),
        source: data.AbstractSource || "duckduckgo.com",
      });
    }

    if (data.Results && Array.isArray(data.Results)) {
      for (const item of data.Results) {
        if (item.FirstURL && item.Text) {
          results.push({
            title: item.Text.split(" - ")[0] || item.Text.slice(0, 80),
            link: item.FirstURL,
            snippet: item.Text,
            source: new URL(item.FirstURL).hostname,
          });
        }
      }
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.Text.slice(0, 80),
            link: topic.FirstURL,
            snippet: topic.Text,
            source: new URL(topic.FirstURL).hostname,
          });
        }
        if (topic.Topics && Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics) {
            if (sub.FirstURL && sub.Text) {
              results.push({
                title: sub.Text.split(" - ")[0] || sub.Text.slice(0, 80),
                link: sub.FirstURL,
                snippet: sub.Text,
                source: new URL(sub.FirstURL).hostname,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("DuckDuckGo search error:", err);
    return NextResponse.json({ results: [], error: "Search request failed" });
  }
}
