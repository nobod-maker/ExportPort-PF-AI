import { NextRequest, NextResponse } from "next/server";
import { processPayPalWebhook } from "@/lib/paypal/webhooks";

/**
 * POST /api/paypal/webhook
 *
 * PayPal Webhook listener:
 * 1. Validates transmission headers
 * 2. Deduplicates events by paypal_event_id
 * 3. Cryptographically verifies webhook signature via PayPal's verify-webhook-signature endpoint
 * 4. Reconciles payment invariants (order ID, capture ID, amount minor units, currency)
 * 5. Updates internal export order status and logs audit timeline event
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);

    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { received: false, status: "failed", error: "Malformed or empty JSON webhook payload." },
        { status: 400 }
      );
    }

    const result = await processPayPalWebhook(request.headers, rawBody);

    if (result.status === "failed") {
      return NextResponse.json(
        {
          received: false,
          status: "failed",
          error: result.error,
          event_id: result.event_id,
        },
        { status: 400 }
      );
    }

    // Success (processed, duplicate, or ignored) returns 200 OK
    return NextResponse.json({
      received: true,
      status: result.status,
      event_id: result.event_id,
      event_type: result.event_type,
      ...(result.error ? { warning: result.error } : {}),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        received: false,
        status: "failed",
        error: error.message || "An unexpected error occurred while processing the webhook.",
      },
      { status: 500 }
    );
  }
}
