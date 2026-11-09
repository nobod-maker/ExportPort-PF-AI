import { NextRequest, NextResponse } from "next/server";
import { ParseOrderRequestSchema } from "@/lib/validation/order";
import { extractOrderFromText } from "@/lib/ai/provider";
import { ParseOrderResponse } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/parse-order
 * Extracts structured export order specifications from raw inquiry text
 * with zero-hallucination guardrails and multi-provider fallback.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json<ParseOrderResponse>(
        {
          success: false,
          data: null as any,
          is_fallback: false,
          missing_fields: [],
          error: "Invalid JSON in request body.",
        },
        { status: 400 }
      );
    }

    const validation = ParseOrderRequestSchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0]?.message || "Validation failed";
      return NextResponse.json<ParseOrderResponse>(
        {
          success: false,
          data: null as any,
          is_fallback: false,
          missing_fields: [],
          error: issue,
        },
        { status: 400 }
      );
    }

    const { text, provider } = validation.data;
    const result = await extractOrderFromText(text, provider);

    const responsePayload: ParseOrderResponse = {
      success: true,
      data: result.data,
      is_fallback: result.is_fallback,
      missing_fields: result.data.missing_fields,
      provider_used: result.provider_used,
      latency_ms: result.latency_ms,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    console.error("Unhandled error in /api/ai/parse-order:", error);
    return NextResponse.json<ParseOrderResponse>(
      {
        success: false,
        data: null as any,
        is_fallback: false,
        missing_fields: [],
        error: error.message || "Internal server error during order parsing.",
      },
      { status: 500 }
    );
  }
}
