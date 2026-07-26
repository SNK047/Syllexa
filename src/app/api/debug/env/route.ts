import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    OPENROUTER: !!process.env.OPENROUTER_API_KEY,
    GROQ: !!process.env.GROQ_API_KEY,
    HUGGINGFACE: !!process.env.HUGGINGFACE_API_KEY,
    TOGETHER: !!process.env.TOGETHER_API_KEY,
  });
}
