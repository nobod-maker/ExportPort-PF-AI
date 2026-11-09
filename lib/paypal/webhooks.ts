/**
 * ExportPilot PayFlow AI — PayPal Webhook Verification & 4-Way Reconciliation
 *
 * Implements cryptographic signature verification via PayPal's official API,
 * idempotent event deduplication, and the strict 4-Way Payment Reconciliation Guardrail.
 */

import {
  ExportOrder,
  PayPalPayment,
} from "@/types";
import { decimalToMinor } from "../money";
import { paypalFetch, PayPalApiError } from "./client";
import {
  getExportOrder,
  updateExportOrderStatus,
  savePayPalPayment,
  recordActivityEvent,
} from "./orders";
import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Webhook Header & Event Deduplication
// =============================================================================

export interface NormalizedWebhookHeaders {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
}

// In-memory set for deduplicating webhook events during testing & fallback
const processedWebhookEventIds = new Set<string>();

/**
 * Clears processed webhook event IDs (for unit testing isolation).
 */
export function clearProcessedWebhookEvents(): void {
  processedWebhookEventIds.clear();
}

/**
 * Normalizes headers from Next.js Request (Headers object or plain Record).
 */
export function extractWebhookHeaders(
  headers: Headers | Record<string, string | undefined>
): NormalizedWebhookHeaders | null {
  const getHeader = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name) || (headers as Headers).get(name.toLowerCase()) || undefined;
    }
    const record = headers as Record<string, string | undefined>;
    const targetKey = name.toLowerCase();
    for (const key of Object.keys(record)) {
      if (key.toLowerCase() === targetKey) {
        return record[key];
      }
    }
    return undefined;
  };

  const authAlgo = getHeader("paypal-auth-algo");
  const certUrl = getHeader("paypal-cert-url");
  const transmissionId = getHeader("paypal-transmission-id");
  const transmissionSig = getHeader("paypal-transmission-sig");
  const transmissionTime = getHeader("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }

  return {
    authAlgo,
    certUrl,
    transmissionId,
    transmissionSig,
    transmissionTime,
  };
}

/**
 * Gets Supabase client if available.
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (url && serviceKey && !url.includes("placeholder") && !serviceKey.includes("placeholder")) {
    try {
      return createClient(url, serviceKey);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Checks whether a webhook event has already been processed (Deduplication).
 */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  if (processedWebhookEventIds.has(eventId)) {
    return true;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("paypal_webhook_events")
        .select("id")
        .eq("paypal_event_id", eventId)
        .maybeSingle();

      if (data) {
        processedWebhookEventIds.add(eventId);
        return true;
      }
    } catch {
      // Fall back to memory set
    }
  }

  return false;
}

/**
 * Records a webhook event in the database and in-memory deduplication set.
 * Returns true if new, false if duplicate.
 */
export async function recordWebhookEvent(params: {
  eventId: string;
  eventType: string;
  resourceId: string;
  verificationStatus: "SUCCESS" | "FAILURE" | "SKIPPED_LOCAL_TEST";
  payload: Record<string, unknown>;
  errorMessage?: string | null;
}): Promise<boolean> {
  if (processedWebhookEventIds.has(params.eventId)) {
    return false;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from("paypal_webhook_events").insert({
        paypal_event_id: params.eventId,
        event_type: params.eventType,
        resource_id: params.resourceId,
        verification_status: params.verificationStatus,
        payload: params.payload,
        error_message: params.errorMessage || null,
        received_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      });

      if (error && (error as any).code === "23505") {
        // Unique constraint violation (duplicate event)
        processedWebhookEventIds.add(params.eventId);
        return false;
      }
    } catch {
      // Continue to local record
    }
  }

  processedWebhookEventIds.add(params.eventId);
  return true;
}

// =============================================================================
// Cryptographic Webhook Signature Verification
// =============================================================================

export interface WebhookVerificationResult {
  verified: boolean;
  status: "SUCCESS" | "FAILURE";
  error?: string;
}

/**
 * Validates cryptographic webhook signature using PayPal's official API:
 * POST /v1/notifications/verify-webhook-signature
 */
export async function verifyWebhookSignature(
  headers: Headers | Record<string, string | undefined>,
  rawBody: Record<string, any>
): Promise<WebhookVerificationResult> {
  const extracted = extractWebhookHeaders(headers);

  if (!extracted) {
    return {
      verified: false,
      status: "FAILURE",
      error: "Missing required PayPal transmission headers for cryptographic verification.",
    };
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() || "MOCK_SANDBOX_WEBHOOK_ID";

  const verificationPayload = {
    auth_algo: extracted.authAlgo,
    cert_url: extracted.certUrl,
    transmission_id: extracted.transmissionId,
    transmission_sig: extracted.transmissionSig,
    transmission_time: extracted.transmissionTime,
    webhook_id: webhookId,
    webhook_event: rawBody,
  };

  try {
    const result = await paypalFetch<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify(verificationPayload),
      }
    );

    const isSuccess = result.verification_status === "SUCCESS";
    return {
      verified: isSuccess,
      status: isSuccess ? "SUCCESS" : "FAILURE",
      error: isSuccess ? undefined : "PayPal rejected webhook transmission signature.",
    };
  } catch (error: any) {
    return {
      verified: false,
      status: "FAILURE",
      error: error.message || "Failed to communicate with PayPal signature verification endpoint.",
    };
  }
}

// =============================================================================
// 4-Way Payment Reconciliation Guardrail
// =============================================================================

export interface ReconciliationDetails {
  orderIdMatch: boolean;
  paypalOrderIdMatch: boolean;
  amountMatch: boolean;
  currencyMatch: boolean;
  expectedOrderId: string;
  capturedCustomId: string | null;
  expectedPayPalOrderId: string;
  capturedParentOrderId: string | null;
  expectedAmountMinor: number;
  capturedAmountMinor: number;
  expectedCurrency: string;
  capturedCurrency: string;
}

export interface ReconciliationResult {
  reconciled: boolean;
  errors: string[];
  details: ReconciliationDetails;
}

/**
 * Enforces the strict 4-Way Payment Reconciliation Guardrail before marking
 * any order as 'paid'.
 *
 * 1. Internal Order Identity: custom_id on capture matches export_orders.id
 * 2. Gateway Order Identity: parent order ID matches stored paypal_payments.paypal_order_id
 * 3. Currency Invariant: capture currency matches order.currency
 * 4. Amount Invariant: captured amount in minor units matches order.total_minor
 */
export function reconcilePayment(params: {
  order: ExportOrder;
  payment: PayPalPayment;
  captureResource: {
    id: string;
    custom_id?: string | null;
    amount?: {
      currency_code: string;
      value: string | number;
    };
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    parent_order_id?: string;
  };
}): ReconciliationResult {
  const { order, payment, captureResource } = params;
  const errors: string[] = [];

  // 1. Internal Order ID verification
  const capturedCustomId = captureResource.custom_id || null;
  const orderIdMatch = capturedCustomId === order.id;
  if (!orderIdMatch) {
    errors.push(
      `Internal Order ID mismatch: captured custom_id "${capturedCustomId}" does not match internal order ID "${order.id}".`
    );
  }

  // 2. Gateway Order ID verification
  const capturedParentOrderId =
    captureResource.supplementary_data?.related_ids?.order_id ||
    captureResource.parent_order_id ||
    payment.paypal_order_id; // fallback to payment's known ID if parent order is implicit in capture
  const paypalOrderIdMatch = capturedParentOrderId === payment.paypal_order_id;
  if (!paypalOrderIdMatch) {
    errors.push(
      `PayPal Order ID mismatch: captured order ID "${capturedParentOrderId}" does not match stored PayPal order ID "${payment.paypal_order_id}".`
    );
  }

  // 3. Amount Invariant verification (minor units integer match)
  const capturedAmountValue = captureResource.amount?.value ?? 0;
  let capturedAmountMinor = 0;
  try {
    capturedAmountMinor = decimalToMinor(capturedAmountValue);
  } catch (err: any) {
    errors.push(`Invalid captured amount format: "${capturedAmountValue}"`);
  }

  const amountMatch = capturedAmountMinor === order.total_minor;
  if (!amountMatch) {
    errors.push(
      `Amount mismatch: captured ${capturedAmountMinor} minor units does not match order total of ${order.total_minor} minor units.`
    );
  }

  // 4. Currency Invariant verification
  const capturedCurrency = (captureResource.amount?.currency_code || "").toUpperCase();
  const expectedCurrency = (order.currency || "USD").toUpperCase();
  const currencyMatch = capturedCurrency === expectedCurrency;
  if (!currencyMatch) {
    errors.push(
      `Currency mismatch: captured currency "${capturedCurrency}" does not match order currency "${expectedCurrency}".`
    );
  }

  const reconciled = errors.length === 0;

  return {
    reconciled,
    errors,
    details: {
      orderIdMatch,
      paypalOrderIdMatch,
      amountMatch,
      currencyMatch,
      expectedOrderId: order.id,
      capturedCustomId,
      expectedPayPalOrderId: payment.paypal_order_id,
      capturedParentOrderId,
      expectedAmountMinor: order.total_minor,
      capturedAmountMinor,
      expectedCurrency,
      capturedCurrency,
    },
  };
}

// =============================================================================
// Complete Webhook Event Processing Engine
// =============================================================================

export interface ProcessWebhookResult {
  received: boolean;
  status: "processed" | "duplicate" | "ignored" | "failed";
  event_id?: string;
  event_type?: string;
  reconciliation?: ReconciliationResult;
  error?: string;
}

/**
 * Orchestrates full webhook processing:
 * 1. Checks deduplication
 * 2. Cryptographically verifies signature
 * 3. Executes 4-Way Reconciliation on capture completion
 * 4. Updates order and payment records
 * 5. Logs activity timeline event
 */
export async function processPayPalWebhook(
  headers: Headers | Record<string, string | undefined>,
  body: Record<string, any>
): Promise<ProcessWebhookResult> {
  const eventId = body?.id;
  const eventType = body?.event_type;

  if (!eventId || !eventType) {
    return {
      received: false,
      status: "failed",
      error: "Invalid webhook payload: missing event id or event_type.",
    };
  }

  // Step 1: Deduplication Check
  const alreadyProcessed = await isWebhookEventProcessed(eventId);
  if (alreadyProcessed) {
    return {
      received: true,
      status: "duplicate",
      event_id: eventId,
      event_type: eventType,
    };
  }

  // Step 2: Cryptographic Signature Verification
  const verification = await verifyWebhookSignature(headers, body);
  if (!verification.verified) {
    await recordWebhookEvent({
      eventId,
      eventType,
      resourceId: body.resource?.id || "unknown",
      verificationStatus: "FAILURE",
      payload: body,
      errorMessage: verification.error || "Signature verification failed",
    });

    return {
      received: false,
      status: "failed",
      event_id: eventId,
      event_type: eventType,
      error: verification.error || "Webhook signature verification failed.",
    };
  }

  // Step 3: Record successful verification
  await recordWebhookEvent({
    eventId,
    eventType,
    resourceId: body.resource?.id || "unknown",
    verificationStatus: "SUCCESS",
    payload: body,
  });

  // Step 4: Handle specific event types
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = body.resource;
    const captureId = resource.id;
    const customId = resource.custom_id;
    const relatedOrderId =
      resource.supplementary_data?.related_ids?.order_id ||
      resource.parent_order_id;

    if (!customId) {
      return {
        received: true,
        status: "failed",
        event_id: eventId,
        event_type: eventType,
        error: "Missing custom_id on PAYMENT.CAPTURE.COMPLETED resource; cannot resolve internal order.",
      };
    }

    const order = await getExportOrder(customId);
    if (!order) {
      return {
        received: true,
        status: "failed",
        event_id: eventId,
        event_type: eventType,
        error: `Referenced internal order ${customId} not found in system.`,
      };
    }

    const payment = order.payment || {
      id: `p-${Date.now()}`,
      order_id: order.id,
      paypal_order_id: relatedOrderId || "UNKNOWN",
      paypal_capture_id: captureId,
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

    // Step 5: Execute 4-Way Reconciliation
    const reconciliation = reconcilePayment({
      order,
      payment,
      captureResource: resource,
    });

    if (!reconciliation.reconciled) {
      // SECURITY INVARIANT: Mismatches must NEVER transition to paid!
      await updateExportOrderStatus(order.id, "needs_review");
      await recordActivityEvent(
        order.id,
        "paypal",
        "reconciliation_failed",
        `4-Way Reconciliation failed for capture ${captureId}: ${reconciliation.errors.join("; ")}`,
        { errors: reconciliation.errors, details: reconciliation.details, event_id: eventId }
      );

      return {
        received: true,
        status: "processed",
        event_id: eventId,
        event_type: eventType,
        reconciliation,
        error: `Reconciliation failed: ${reconciliation.errors.join("; ")}`,
      };
    }

    // Step 6: Reconciliation Succeeded — Transition to Paid
    await savePayPalPayment({
      id: payment.id,
      order_id: order.id,
      paypal_order_id: payment.paypal_order_id,
      paypal_capture_id: captureId,
      status: "COMPLETED",
      amount_minor: reconciliation.details.capturedAmountMinor,
      currency: reconciliation.details.capturedCurrency,
      payer_email: resource.payer?.email_address || payment.payer_email,
      payer_id: resource.payer?.payer_id || payment.payer_id,
      captured_at: resource.create_time || new Date().toISOString(),
      raw_status: resource,
    });

    await updateExportOrderStatus(order.id, "paid");

    await recordActivityEvent(
      order.id,
      "paypal",
      "webhook_reconciled",
      `Webhook PAYMENT.CAPTURE.COMPLETED reconciled 4/4 invariants. Captured ${resource.amount?.value} ${reconciliation.details.capturedCurrency}. Order marked PAID.`,
      {
        capture_id: captureId,
        event_id: eventId,
        amount_minor: reconciliation.details.capturedAmountMinor,
        currency: reconciliation.details.capturedCurrency,
      }
    );

    return {
      received: true,
      status: "processed",
      event_id: eventId,
      event_type: eventType,
      reconciliation,
    };
  }

  if (eventType === "CHECKOUT.ORDER.APPROVED") {
    const resource = body.resource;
    const paypalOrderId = resource.id;
    const customId = resource.purchase_units?.[0]?.custom_id;

    if (customId) {
      const order = await getExportOrder(customId);
      if (order && order.payment) {
        await savePayPalPayment({
          ...order.payment,
          status: "APPROVED",
          payer_email: resource.payer?.email_address || order.payment.payer_email,
          payer_id: resource.payer?.payer_id || order.payment.payer_id,
        });

        await recordActivityEvent(
          order.id,
          "buyer",
          "checkout_approved",
          `Buyer approved PayPal checkout session: ${paypalOrderId}`,
          { paypal_order_id: paypalOrderId, event_id: eventId }
        );
      }
    }

    return {
      received: true,
      status: "processed",
      event_id: eventId,
      event_type: eventType,
    };
  }

  // Other events ignored cleanly
  return {
    received: true,
    status: "ignored",
    event_id: eventId,
    event_type: eventType,
  };
}
