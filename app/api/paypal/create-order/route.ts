import { NextRequest, NextResponse } from "next/server";
import { CreateOrderRequestSchema } from "@/lib/validation/order";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { PayPalApiError } from "@/lib/paypal/client";

/**
 * POST /api/paypal/create-order
 *
 * Validates the order ID, checks that the seller has approved the quote (status === 'quoted'),
 * recalculates totals from database line items, and initiates a PayPal Orders v2 checkout session.
 */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);

    if (!json) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const parseResult = CreateOrderRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { order_id } = parseResult.data;

    const result = await createPayPalOrder(order_id);

    return NextResponse.json({
      success: true,
      paypal_order_id: result.paypal_order_id,
      approve_url: result.approve_url,
      amount_minor: result.amount_minor,
      currency: result.currency,
      order_number: result.order.order_number,
    });
  } catch (error: any) {
    if (error instanceof PayPalApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.errorCode,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create PayPal order.",
      },
      { status: 500 }
    );
  }
}
