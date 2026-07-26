import { NextRequest } from "next/server";
import { getProvider } from "@/lib/ai/providers";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, temperature, maxTokens, systemPrompt } = body;

    if (!model || !messages?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: model, messages" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const provider = getProvider("qwen");
    if (!provider) {
      return new Response(
        JSON.stringify({ error: "QWEN_API_KEY not configured. Add QWEN_API_KEY to environment variables." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of provider.chat(messages, model, {
            temperature,
            maxTokens,
            systemPrompt,
          })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err?.message || "Stream error" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  const { getProviders, getAllModels } = await import("@/lib/ai/providers");
  const providers = getProviders();
  const models = getAllModels();
  return Response.json({
    providers: providers.map((p) => ({ id: p.id, name: p.name, icon: p.icon, color: p.color, isAvailable: p.isAvailable, modelCount: p.models.length })),
    models,
  });
}
