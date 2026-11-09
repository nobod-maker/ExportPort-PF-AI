"use client";

import {
  ExportOrder,
  AIExtractionResult,
  ActivityEvent,
  OrderStatus,
} from "@/types";
import {
  MOCK_EXPORT_ORDERS,
  MOCK_BUYERS,
  AUTHORITATIVE_UAE_EXTRACTION,
  AUTHORITATIVE_UAE_ENQUIRY_TEXT,
} from "@/lib/mock-data";
import { calculateOrderTotals, calculateLineTotal } from "@/lib/money";

const STORAGE_KEY = "exportpilot_orders_v1";

let inMemoryOrders: ExportOrder[] = [...MOCK_EXPORT_ORDERS];

/**
 * Retrieve orders from localStorage or fall back to authoritative mock seeds.
 */
export function getStoredOrders(): ExportOrder[] {
  if (typeof window === "undefined") {
    return [...inMemoryOrders];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryOrders));
      return [...inMemoryOrders];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      inMemoryOrders = parsed;
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryOrders));
    return [...inMemoryOrders];
  } catch (err) {
    console.error("Failed to read orders from localStorage:", err);
    return [...inMemoryOrders];
  }
}

/**
 * Persist orders array to localStorage and notify listeners.
 */
export function saveOrders(orders: ExportOrder[]): void {
  inMemoryOrders = [...orders];
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("exportpilot:orders-updated", { detail: orders }));
  } catch (err) {
    console.error("Failed to save orders to localStorage:", err);
  }
}

/**
 * Find order by UUID or order_number.
 */
export function getStoredOrderById(idOrNumber: string): ExportOrder | undefined {
  const orders = getStoredOrders();
  return orders.find(
    (o) => o.id === idOrNumber || o.order_number.toLowerCase() === idOrNumber.toLowerCase()
  );
}

/**
 * Reset orders store to authoritative mock seeds.
 */
export function resetOrdersToDefault(): ExportOrder[] {
  inMemoryOrders = [...MOCK_EXPORT_ORDERS];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  saveOrders(inMemoryOrders);
  return [...inMemoryOrders];
}

/**
 * Create a new draft ExportOrder from extracted AI data.
 */
export function createOrderFromExtraction(
  sourceMessage: string,
  extraction: AIExtractionResult
): ExportOrder {
  const orders = getStoredOrders();
  const nextNum = orders.length + 1;
  const orderNumber = `EXP-2026-${String(nextNum).padStart(3, "0")}`;
  const orderId = `e1000000-0000-4000-a000-${String(nextNum).padStart(12, "0")}`;

  // Find or construct buyer
  const buyer = {
    id: `b1000000-0000-4000-a000-${String(nextNum).padStart(12, "0")}`,
    owner_id: "00000000-0000-4000-a000-000000000001",
    name: extraction.buyer_name || "Unknown Buyer",
    email: extraction.buyer_email,
    company_name: extraction.buyer_company,
    country_code: extraction.destination_country || "AE",
    phone: null,
    address: {
      country: extraction.destination_country || "AE",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Convert extracted items to order items
  const items = extraction.items.map((item, idx) => {
    const qty = item.quantity || 1;
    const unitPrice = item.unit_price_minor ?? 0;
    return {
      id: `i1000000-0000-4000-a000-${String(nextNum).padStart(8, "0")}${String(idx + 1).padStart(4, "0")}`,
      order_id: orderId,
      description: item.description,
      sku: item.sku || null,
      quantity: qty,
      unit_price_minor: unitPrice,
      line_total_minor: calculateLineTotal(qty, unitPrice),
      created_at: new Date().toISOString(),
    };
  });

  const totals = calculateOrderTotals(
    items.map((i) => ({ quantity: i.quantity, unit_price_minor: i.unit_price_minor })),
    extraction.shipping_minor ?? 0,
    0
  );

  const initialTimeline: ActivityEvent[] = [
    {
      id: `a1000000-0000-4000-a000-${String(Date.now()).slice(-12)}`,
      order_id: orderId,
      actor: "buyer",
      event_type: "inquiry_received",
      summary: `Inquiry received from ${buyer.name}${buyer.company_name ? ` (${buyer.company_name})` : ""}`,
      created_at: new Date().toISOString(),
    },
    {
      id: `a1000000-0000-4000-a000-${String(Date.now() + 1).slice(-12)}`,
      order_id: orderId,
      actor: "ai",
      event_type: "order_parsed",
      summary: `AI extracted ${items.length} item(s) (Confidence: Math.round(${(extraction.confidence_score || 0.95) * 100})%)`,
      metadata: {
        missing_fields: extraction.missing_fields,
        is_fallback: extraction.is_fallback,
      },
      created_at: new Date().toISOString(),
    },
  ];

  const newOrder: ExportOrder = {
    id: orderId,
    owner_id: "00000000-0000-4000-a000-000000000001",
    buyer_id: buyer.id,
    order_number: orderNumber,
    source_message: sourceMessage,
    destination_country: extraction.destination_country || "AE",
    currency: extraction.currency || "USD",
    subtotal_minor: totals.subtotal_minor,
    shipping_minor: totals.shipping_minor,
    tax_minor: totals.tax_minor,
    total_minor: totals.total_minor,
    status: "draft",
    incoterm: extraction.incoterm || "FOB",
    ai_extraction: extraction,
    ai_confidence: extraction.confidence_score,
    seller_notes: extraction.notes || null,
    seller_approved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    buyer,
    items,
    activity_events: initialTimeline,
  };

  const updatedOrders = [newOrder, ...orders];
  saveOrders(updatedOrders);
  return newOrder;
}

/**
 * Update an existing quotation and mark it approved as 'quoted'.
 */
export function approveQuotation(
  orderId: string,
  data: {
    items: {
      id?: string;
      description: string;
      sku?: string | null;
      quantity: number;
      unit_price_minor: number;
    }[];
    shipping_minor: number;
    tax_minor: number;
    incoterm: any;
    seller_notes?: string | null;
  }
): ExportOrder {
  const orders = getStoredOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    throw new Error(`Order ${orderId} not found`);
  }

  const existing = orders[orderIndex];

  // Recalculate totals
  const updatedItems = data.items.map((it, idx) => ({
    id: it.id || `i1000000-0000-4000-a000-${Date.now()}-${idx}`,
    order_id: orderId,
    description: it.description,
    sku: it.sku || null,
    quantity: Math.max(1, it.quantity),
    unit_price_minor: Math.max(0, it.unit_price_minor),
    line_total_minor: calculateLineTotal(it.quantity, it.unit_price_minor),
    created_at: existing.created_at,
  }));

  const totals = calculateOrderTotals(
    updatedItems.map((i) => ({ quantity: i.quantity, unit_price_minor: i.unit_price_minor })),
    data.shipping_minor,
    0
  );

  const approvalEvent: ActivityEvent = {
    id: `a1000000-0000-4000-a000-${String(Date.now()).slice(-12)}`,
    order_id: orderId,
    actor: "seller",
    event_type: "quote_approved",
    summary: `Seller approved quotation: ${updatedItems.length} item(s), Total: $${(totals.total_minor / 100).toFixed(2)} USD (Incoterm: ${data.incoterm || "FOB"})`,
    metadata: {
      total_minor: totals.total_minor,
      incoterm: data.incoterm,
    },
    created_at: new Date().toISOString(),
  };

  const updatedOrder: ExportOrder = {
    ...existing,
    items: updatedItems,
    subtotal_minor: totals.subtotal_minor,
    shipping_minor: totals.shipping_minor,
    tax_minor: totals.tax_minor,
    total_minor: totals.total_minor,
    status: "quoted",
    incoterm: data.incoterm,
    seller_notes: data.seller_notes ?? existing.seller_notes,
    seller_approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activity_events: [...(existing.activity_events || []), approvalEvent],
  };

  orders[orderIndex] = updatedOrder;
  saveOrders(orders);
  return updatedOrder;
}

/**
 * Record a PayPal payment capture and transition order to 'paid'.
 */
export function recordPayPalCapture(
  orderId: string,
  paypalOrderId: string,
  captureId: string,
  payerEmail?: string
): ExportOrder {
  const orders = getStoredOrders();
  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) {
    throw new Error(`Order ${orderId} not found`);
  }

  const existing = orders[orderIndex];

  const paymentEvent: ActivityEvent = {
    id: `a1000000-0000-4000-a000-${String(Date.now()).slice(-12)}`,
    order_id: orderId,
    actor: "paypal",
    event_type: "payment_captured",
    summary: `PayPal Sandbox payment captured. Capture ID: ${captureId} for $${(existing.total_minor / 100).toFixed(2)} USD`,
    metadata: {
      paypal_order_id: paypalOrderId,
      capture_id: captureId,
      payer_email: payerEmail,
    },
    created_at: new Date().toISOString(),
  };

  const updatedOrder: ExportOrder = {
    ...existing,
    status: "paid",
    updated_at: new Date().toISOString(),
    payment: {
      id: `p1000000-0000-4000-a000-${String(Date.now()).slice(-12)}`,
      order_id: orderId,
      paypal_order_id: paypalOrderId,
      paypal_capture_id: captureId,
      status: "COMPLETED",
      amount_minor: existing.total_minor,
      currency: existing.currency,
      approval_url: `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`,
      payer_email: payerEmail || existing.buyer?.email || "sandbox-buyer@paypal.com",
      payer_id: "P_SANDBOX_" + Math.random().toString(36).substring(2, 9).toUpperCase(),
      created_at: new Date().toISOString(),
      captured_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    activity_events: [...(existing.activity_events || []), paymentEvent],
  };

  orders[orderIndex] = updatedOrder;
  saveOrders(orders);
  return updatedOrder;
}
