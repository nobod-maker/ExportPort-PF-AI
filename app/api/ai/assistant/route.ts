import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAssistantAdvice } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

const AssistantRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  orderContext: z.record(z.unknown()).optional(),
  provider: z.enum(["gemini", "openrouter", "fallback", "auto"]).optional().default("auto"),
});

/**
 * POST /api/ai/assistant
 * Interactive export trade, Incoterms, and payment advisory endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          reply: "",
          error: "Invalid JSON in request body.",
        },
        { status: 400 }
      );
    }

    const validation = AssistantRequestSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0]?.message || "Validation failed";
      return NextResponse.json(
        {
          success: false,
          reply: "",
          error: issue,
        },
        { status: 400 }
      );
    }

    const { message, orderContext, provider } = validation.data;
    const result = await generateAssistantAdvice(message, orderContext, provider);

    return NextResponse.json(
      {
        success: true,
        reply: result.reply,
        provider_used: result.provider_used,
        is_fallback: result.is_fallback,
        latency_ms: result.latency_ms,
        suggestions: result.suggestions,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Unhandled error in /api/ai/assistant:", error);
    return NextResponse.json(
      {
        success: false,
        reply: "",
        error: error.message || "Internal server error during assistant query.",
      },
      { status: 500 }
    );
  }
}
