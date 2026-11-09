/**
 * ExportPilot PayFlow AI — PayPal Orders v2 Lifecycle Engine
 *
 * Implements server-side order creation with non-trustable client total recalculation,
 * intent CAPTURE, custom_id matching, and server-side capture with PayPal-Request-Id idempotency.
 */

import {
  ExportOrder,
  PayPalPayment,
  ActivityEvent,
  OrderStatus,
  PaymentStatus,
  ActivityActor,
} from "@/types";
import { minorToDecimalString, calculateLineTotal } from "../money";
import { MOCK_EXPORT_ORDERS } from "../mock-data";
import { paypalFetch, PayPalApiError } from "./client";
import { createClient } from "@supabase/supabase-js";

// =============================================================================
// In-Memory / Supabase Hybrid Data Store
// =============================================================================

// In-memory clone map for offline simulation & test execution
const inMemoryOrders = new Map<string, ExportOrder>();
const inMemoryPayments = new Map<string, PayPalPayment>(); // keyed by order_id or paypal_order_id
const inMemoryActivityEvents = new Map<string, ActivityEvent[]>();

/**
 * Initializes in-memory order cache from authoritative mock seed data.
 */
function initInMemoryOrders(): void {
  inMemoryOrders.clear();
  inMemoryPayments.clear();
  inMemoryActivityEvents.clear();

  for (const order of MOCK_EXPORT_ORDERS) {
    const cloned: ExportOrder = JSON.parse(JSON.stringify(order));
    inMemoryOrders.set(cloned.id, cloned);
    if (cloned.payment) {
      inMemoryPayments.set(cloned.id, cloned.payment);
      inMemoryPayments.set(cloned.payment.paypal_order_id, cloned.payment);
    }
    if (cloned.activity_events) {
      inMemoryActivityEvents.set(cloned.id, [...cloned.activity_events]);
    }
  }
}

// Initialize on module load
initInMemoryOrders();

/**
 * Resets the in-memory store to its default seed state.
 */
export function resetMockOrders(): void {
  initInMemoryOrders();
}

/**
 * Retrieves a mock order from in-memory store (for testing inspection).
 */
export function getMockOrder(orderId: string): ExportOrder | undefined {
  return inMemoryOrders.get(orderId);
}

/**
 * Sets or updates a mock order in the in-memory store (for test scenarios).
 */
export function setMockOrder(order: ExportOrder): void {
  inMemoryOrders.set(order.id, JSON.parse(JSON.stringify(order)));
}

/**
 * Gets Supabase service-role client if environment variables are configured.
 */
function getSupabaseServerClient() {
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
 * Fetches an export order with its items, buyer, and payment details.
 */
export async function getExportOrder(orderId: string): Promise<ExportOrder | null> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("export_orders")
        .select(`
          *,
          items:order_items(*),
          buyer:buyers(*),
          payment:paypal_payments(*)
        `)
        .eq("id", orderId)
        .single();

      if (!error && data) {
        return {
          ...data,
          payment: Array.isArray(data.payment) ? data.payment[0] : data.payment,
        } as ExportOrder;
      }
    } catch {
      // Fallback to in-memory on error
    }
  }

  const order = inMemoryOrders.get(orderId);
  if (!order) return null;

  // Hydrate payment from memory if present
  const payment = inMemoryPayments.get(orderId) || order.payment || null;
  const events = inMemoryActivityEvents.get(orderId) || order.activity_events || [];

  return {
    ...JSON.parse(JSON.stringify(order)),
    payment,
    activity_events: events,
  };
}

/**
 * Updates the status of an export order in the database or in-memory store.
 */
export async function updateExportOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: {
    subtotal_minor?: number;
    shipping_minor?: number;
    tax_minor?: number;
    total_minor?: number;
  }
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const updatePayload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
    ...(extra || {}),
  };

  if (supabase) {
    try {
      await supabase
        .from("export_orders")
        .update(updatePayload)
        .eq("id", orderId);
    } catch {
      // Continue to update memory
    }
  }

  const existing = inMemoryOrders.get(orderId);
  if (existing) {
    Object.assign(existing, updatePayload);
    inMemoryOrders.set(orderId, existing);
  }
}

/**
 * Creates or updates a PayPal payment record.
 */
export async function savePayPalPayment(
  paymentData: Partial<PayPalPayment> & {
    order_id: string;
    paypal_order_id: string;
    status: PaymentStatus;
    amount_minor: number;
    currency: string;
  }
): Promise<PayPalPayment> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const record: PayPalPayment = {
    id: paymentData.id || `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    order_id: paymentData.order_id,
    paypal_order_id: paymentData.paypal_order_id,
    paypal_capture_id: paymentData.paypal_capture_id || null,
    status: paymentData.status,
    amount_minor: paymentData.amount_minor,
    currency: paymentData.currency,
    approval_url: paymentData.approval_url || null,
    payer_email: paymentData.payer_email || null,
    payer_id: paymentData.payer_id || null,
    raw_status: paymentData.raw_status || {},
    created_at: paymentData.created_at || now,
    captured_at: paymentData.captured_at || null,
    updated_at: now,
  };

  if (supabase) {
    try {
      await supabase
        .from("paypal_payments")
        .upsert(record, { onConflict: "paypal_order_id" });
    } catch {
      // Fallback to in-memory
    }
  }

  inMemoryPayments.set(record.order_id, record);
  inMemoryPayments.set(record.paypal_order_id, record);

  const order = inMemoryOrders.get(record.order_id);
  if (order) {
    order.payment = record;
  }

  return record;
}

/**
 * Records an activity event in the timeline log.
 */
export async function recordActivityEvent(
  orderId: string,
  actor: ActivityActor,
  eventType: string,
  summary: string,
  metadata: Record<string, unknown> = {}
): Promise<ActivityEvent> {
  const supabase = getSupabaseServerClient();
  const event: ActivityEvent = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    order_id: orderId,
    actor,
    event_type: eventType,
    summary,
    metadata,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("activity_events").insert(event);
    } catch {
      // Fallback to memory
    }
  }

  const existing = inMemoryActivityEvents.get(orderId) || [];
  existing.unshift(event);
  inMemoryActivityEvents.set(orderId, existing);

  const order = inMemoryOrders.get(orderId);
  if (order) {
    order.activity_events = existing;
  }

  return event;
}

// =============================================================================
// PayPal Order Creation & Capture Core Logic
// =============================================================================

export interface CreatePayPalOrderResult {
  paypal_order_id: string;
  approve_url: string;
  order: ExportOrder;
  amount_minor: number;
  currency: string;
}

/**
 * Validates order state, recalculates totals on the server directly from DB items,
 * and calls PayPal Orders v2 Sandbox to create a checkout session.
 *
 * CRITICAL SECURITY INVARIANT:
 * Client-provided totals are NEVER trusted. Totals are recalculated directly from
 * verified database order items.
 */
export async function createPayPalOrder(orderId: string): Promise<CreatePayPalOrderResult> {
  const order = await getExportOrder(orderId);

  if (!order) {
    throw new PayPalApiError(
      `Order ${orderId} does not exist in the system.`,
      404,
      "RESOURCE_NOT_FOUND"
    );
  }

  // Guard: Seller Approval Gate
  if (order.status !== "quoted") {
    throw new PayPalApiError(
      `Order must be in 'quoted' status with seller approval before creating checkout. Current status: '${order.status}'`,
      400,
      "INVALID_REQUEST"
    );
  }

  const items = order.items || [];
  if (items.length === 0) {
    throw new PayPalApiError(
      `Order ${orderId} contains no line items.`,
      400,
      "INVALID_REQUEST"
    );
  }

  // Recalculate totals directly from server database items
  let recomputedSubtotalMinor = 0;
  for (const item of items) {
    if (!item.unit_price_minor || item.unit_price_minor <= 0) {
      throw new PayPalApiError(
        `Line item "${item.description}" has no approved unit price.`,
        400,
        "INVALID_REQUEST"
      );
    }
    const lineTotal = calculateLineTotal(item.quantity, item.unit_price_minor);
    recomputedSubtotalMinor += lineTotal;
  }

  const safeShippingMinor = Math.max(0, Math.round(order.shipping_minor || 0));
  const safeTaxMinor = Math.max(0, Math.round(order.tax_minor || 0));
  const recomputedTotalMinor = recomputedSubtotalMinor + safeShippingMinor + safeTaxMinor;

  if (recomputedTotalMinor <= 0) {
    throw new PayPalApiError(
      "Recalculated order total must be greater than zero.",
      400,
      "INVALID_REQUEST"
    );
  }

  // Update order with authoritative server totals
  order.subtotal_minor = recomputedSubtotalMinor;
  order.shipping_minor = safeShippingMinor;
  order.tax_minor = safeTaxMinor;
  order.total_minor = recomputedTotalMinor;

  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const currency = (order.currency || "USD").toUpperCase();

  // Construct standard PayPal Orders v2 payload
  const paypalPayload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: order.id,
        custom_id: order.id, // Primary key for 4-Way Reconciliation
        invoice_id: order.order_number,
        description: `ExportPilot Order #${order.order_number} to ${order.destination_country}`,
        amount: {
          currency_code: currency,
          value: minorToDecimalString(recomputedTotalMinor),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: minorToDecimalString(recomputedSubtotalMinor),
            },
            shipping: {
              currency_code: currency,
              value: minorToDecimalString(safeShippingMinor),
            },
            tax_total: {
              currency_code: currency,
              value: minorToDecimalString(safeTaxMinor),
            },
          },
        },
        items: items.map((item) => ({
          name: item.description.substring(0, 127), // PayPal item name max length 127
          sku: item.sku ? item.sku.substring(0, 127) : undefined,
          quantity: item.quantity.toString(),
          unit_amount: {
            currency_code: currency,
            value: minorToDecimalString(item.unit_price_minor),
          },
        })),
      },
    ],
    application_context: {
      brand_name: "ExportPilot PayFlow",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: `${appBaseUrl}/orders/${order.id}/pay?status=success`,
      cancel_url: `${appBaseUrl}/orders/${order.id}/pay?status=cancel`,
    },
  };

  // Dispatch request to PayPal API (or offline sandbox simulator)
  const paypalResponse = await paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify(paypalPayload),
  });

  const paypalOrderId = paypalResponse.id;
  const approveLink =
    paypalResponse.links?.find((link: any) => link.rel === "approve")?.href ||
    `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`;

  // Persist payment record
  await savePayPalPayment({
    order_id: order.id,
    paypal_order_id: paypalOrderId,
    status: "CREATED",
    amount_minor: recomputedTotalMinor,
    currency,
    approval_url: approveLink,
    raw_status: paypalResponse,
  });

  // Transition order status to awaiting_payment and persist authoritative recalculated totals
  await updateExportOrderStatus(order.id, "awaiting_payment", {
    subtotal_minor: recomputedSubtotalMinor,
    shipping_minor: safeShippingMinor,
    tax_minor: safeTaxMinor,
    total_minor: recomputedTotalMinor,
  });

  // Record audit timeline event
  await recordActivityEvent(
    order.id,
    "paypal",
    "checkout_created",
    `Created PayPal Orders v2 session: ${paypalOrderId} for ${minorToDecimalString(recomputedTotalMinor)} ${currency}`,
    { paypal_order_id: paypalOrderId, amount_minor: recomputedTotalMinor, currency }
  );

  return {
    paypal_order_id: paypalOrderId,
    approve_url: approveLink,
    order,
    amount_minor: recomputedTotalMinor,
    currency,
  };
}

/**
 * Executes server-side capture of an approved PayPal order.
 * Utilizes PayPal-Request-Id header for idempotency protection.
 */
export async function capturePayPalOrder(
  paypalOrderId: string,
  idempotencyKey?: string
): Promise<any> {
  if (!paypalOrderId || typeof paypalOrderId !== "string") {
    throw new PayPalApiError(
      "A valid paypal_order_id must be provided for capture.",
      400,
      "INVALID_REQUEST"
    );
  }

  const safeIdempotencyKey = idempotencyKey || `${paypalOrderId}-capture`;

  const captureResponse = await paypalFetch(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: "POST",
      idempotencyKey: safeIdempotencyKey,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return captureResponse;
}
