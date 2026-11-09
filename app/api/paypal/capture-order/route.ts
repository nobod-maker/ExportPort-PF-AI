import { NextRequest, NextResponse } from "next/server";
import { CapturePaymentRequestSchema } from "@/lib/validation/order";
import {
  getExportOrder,
  capturePayPalOrder,
  savePayPalPayment,
  updateExportOrderStatus,
  recordActivityEvent,
} from "@/lib/paypal/orders";
import { reconcilePayment } from "@/lib/paypal/webhooks";
import { PayPalApiError } from "@/lib/paypal/client";

/**
 * POST /api/paypal/capture-order
 *
 * Executes server-side capture of approved PayPal checkout session, verifies capture status,
 * applies the strict 4-Way Payment Reconciliation Guardrail, and transitions order to 'paid'.
 *
 * CRITICAL RULE:
 * Never mark an order paid based only on a browser redirect!
 * The server MUST capture funds and verify the 4-way invariants before marking paid.
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

    const parseResult = CapturePaymentRequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { order_id, paypal_order_id } = parseResult.data;

    const order = await getExportOrder(order_id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order ${order_id} not found.` },
        { status: 404 }
      );
    }

    // Capture payment funds from PayPal with idempotency
    const captureResponse = await capturePayPalOrder(paypal_order_id, `${order_id}-capture`);

    const captureResource =
      captureResponse.purchase_units?.[0]?.payments?.captures?.[0];

    if (!captureResource) {
      return NextResponse.json(
        {
          success: false,
          error: "No capture record found in PayPal capture response.",
        },
        { status: 400 }
      );
    }

    if (captureResource.status !== "COMPLETED" && captureResponse.status !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment capture was not completed. Status: ${captureResource.status || captureResponse.status}`,
        },
        { status: 400 }
      );
    }

    // Default payment record if not yet hydrated
    const payment = order.payment || {
      id: `p-${Date.now()}`,
      order_id: order.id,
      paypal_order_id,
      paypal_capture_id: captureResource.id,
      status: "CREATED",
      amount_minor: order.total_minor,
      currency: order.currency,
      approval_url: null,
      payer_email: null,
      payer_id: null,
      created_at: new Date().toISOString(),
      captured_at: null,
      updated_at: new Date().toISOString(),
    };

    // Execute 4-Way Reconciliation
    const reconciliation = reconcilePayment({
      order,
      payment,
      captureResource: {
        ...captureResource,
        custom_id: captureResource.custom_id || order.id,
        parent_order_id: paypal_order_id,
      },
    });

    if (!reconciliation.reconciled) {
      await updateExportOrderStatus(order.id, "needs_review");
      await recordActivityEvent(
        order.id,
        "paypal",
        "reconciliation_failed",
        `4-Way Reconciliation failed during capture: ${reconciliation.errors.join("; ")}`,
        { errors: reconciliation.errors, details: reconciliation.details }
      );

      return NextResponse.json(
        {
          success: false,
          reconciled: false,
          error: `4-way reconciliation failed: ${reconciliation.errors.join("; ")}`,
          details: reconciliation.details,
        },
        { status: 400 }
      );
    }

    // Update payment record with capture details
    await savePayPalPayment({
      id: payment.id,
      order_id: order.id,
      paypal_order_id,
      paypal_capture_id: captureResource.id,
      status: "COMPLETED",
      amount_minor: reconciliation.details.capturedAmountMinor,
      currency: reconciliation.details.capturedCurrency,
      payer_email: captureResponse.payer?.email_address,
      payer_id: captureResponse.payer?.payer_id,
      captured_at: captureResource.create_time || new Date().toISOString(),
      raw_status: captureResponse,
    });

    // Mark order as paid
    await updateExportOrderStatus(order.id, "paid");

    // Record audit event
    await recordActivityEvent(
      order.id,
      "paypal",
      "payment_captured",
      `Captured ${captureResource.amount?.value} ${reconciliation.details.capturedCurrency} via PayPal (Capture ID: ${captureResource.id}). Order marked PAID.`,
      {
        capture_id: captureResource.id,
        amount_minor: reconciliation.details.capturedAmountMinor,
        currency: reconciliation.details.capturedCurrency,
      }
    );

    return NextResponse.json({
      success: true,
      capture_id: captureResource.id,
      status: "COMPLETED",
      reconciled: true,
      order_status: "paid",
      amount_captured: captureResource.amount?.value,
      currency: reconciliation.details.capturedCurrency,
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
        error: error.message || "Failed to capture PayPal order.",
      },
      { status: 500 }
    );
  }
}
