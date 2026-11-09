import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPayPalAccessToken,
  getPayPalApiBaseUrl,
  isPayPalConfigured,
  shouldUseMockSandbox,
  clearPayPalTokenCache,
  classifyPayPalError,
  PayPalApiError,
  paypalFetch,
} from "@/lib/paypal/client";
import {
  createPayPalOrder,
  capturePayPalOrder,
  getExportOrder,
  resetMockOrders,
  setMockOrder,
  getMockOrder,
} from "@/lib/paypal/orders";
import {
  verifyWebhookSignature,
  reconcilePayment,
  processPayPalWebhook,
  clearProcessedWebhookEvents,
  extractWebhookHeaders,
} from "@/lib/paypal/webhooks";
import { POST as createOrderRoute } from "@/app/api/paypal/create-order/route";
import { POST as captureOrderRoute } from "@/app/api/paypal/capture-order/route";
import { POST as webhookRoute } from "@/app/api/paypal/webhook/route";
import { NextRequest } from "next/server";
import { ExportOrder, PayPalPayment } from "@/types";

describe("Milestone 3: PayPal Sandbox & Webhook Reconciliation Module", () => {
  beforeEach(() => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_ENVIRONMENT;
    delete process.env.PAYPAL_API_BASE_URL;
    clearPayPalTokenCache();
    clearProcessedWebhookEvents();
    resetMockOrders();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. PayPal Client & OAuth Token Management
  // ===========================================================================
  describe("PayPal Client & OAuth Token Management", () => {
    it("detects sandbox environment by default", () => {
      delete process.env.PAYPAL_ENVIRONMENT;
      delete process.env.PAYPAL_API_BASE_URL;
      expect(getPayPalApiBaseUrl()).toBe("https://api-m.sandbox.paypal.com");
    });

    it("respects production environment setting", () => {
      const originalEnv = process.env.PAYPAL_ENVIRONMENT;
      process.env.PAYPAL_ENVIRONMENT = "production";
      expect(getPayPalApiBaseUrl()).toBe("https://api-m.paypal.com");
      if (originalEnv !== undefined) {
        process.env.PAYPAL_ENVIRONMENT = originalEnv;
      } else {
        delete process.env.PAYPAL_ENVIRONMENT;
      }
    });

    it("identifies unconfigured state or placeholder credentials", () => {
      const origId = process.env.PAYPAL_CLIENT_ID;
      const origSecret = process.env.PAYPAL_CLIENT_SECRET;

      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;
      expect(isPayPalConfigured()).toBe(false);
      expect(shouldUseMockSandbox()).toBe(true);

      process.env.PAYPAL_CLIENT_ID = "your-paypal-client-id";
      process.env.PAYPAL_CLIENT_SECRET = "your-paypal-client-secret";
      expect(isPayPalConfigured()).toBe(false);

      if (origId !== undefined) {
        process.env.PAYPAL_CLIENT_ID = origId;
      } else {
        delete process.env.PAYPAL_CLIENT_ID;
      }
      if (origSecret !== undefined) {
        process.env.PAYPAL_CLIENT_SECRET = origSecret;
      } else {
        delete process.env.PAYPAL_CLIENT_SECRET;
      }
    });

    it("obtains and caches OAuth access token", async () => {
      const token1 = await getPayPalAccessToken();
      expect(token1).toBeDefined();
      expect(typeof token1).toBe("string");
      expect(token1.length).toBeGreaterThan(10);

      // Second call should return identical cached token
      const token2 = await getPayPalAccessToken();
      expect(token2).toBe(token1);
    });

    it("refreshes token when forceRefresh is true", async () => {
      const token1 = await getPayPalAccessToken();
      // Sleep slightly to guarantee different timestamp in mock token
      await new Promise((r) => setTimeout(r, 5));
      const token2 = await getPayPalAccessToken(true);
      expect(token2).not.toBe(token1);
    });

    it("classifies PayPal HTTP errors correctly", () => {
      expect(classifyPayPalError(401)).toBe("AUTHENTICATION_FAILURE");
      expect(classifyPayPalError(403)).toBe("AUTHENTICATION_FAILURE");
      expect(classifyPayPalError(400)).toBe("INVALID_REQUEST");
      expect(classifyPayPalError(404)).toBe("RESOURCE_NOT_FOUND");
      expect(classifyPayPalError(422)).toBe("UNPROCESSABLE_ENTITY");
      expect(classifyPayPalError(429)).toBe("RATE_LIMITED");
      expect(classifyPayPalError(500)).toBe("GATEWAY_ERROR");
      expect(classifyPayPalError(503)).toBe("GATEWAY_ERROR");
    });

    it("constructs PayPalApiError with status, code, details, and debugId", () => {
      const err = new PayPalApiError(
        "Invalid currency",
        400,
        "INVALID_REQUEST",
        [{ issue: "CURRENCY_NOT_SUPPORTED", field: "/amount/currency_code" }],
        "DEBUG-998877"
      );

      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe("INVALID_REQUEST");
      expect(err.details).toEqual([
        { issue: "CURRENCY_NOT_SUPPORTED", field: "/amount/currency_code" },
      ]);
      expect(err.debugId).toBe("DEBUG-998877");
      expect(err.message).toContain("PayPal API Error");
    });
  });

  // ===========================================================================
  // 2. Order Creation & Server-Side Totals Recalculation
  // ===========================================================================
  describe("Order Creation & Server-Side Totals Recalculation", () => {
    it("creates a PayPal order for a seller-approved quoted order", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001"; // Authoritative UAE Order
      const result = await createPayPalOrder(orderId);

      expect(result.paypal_order_id).toBeDefined();
      expect(result.approve_url).toContain(result.paypal_order_id);
      expect(result.amount_minor).toBe(365000); // 100 * 35.00 ($3500) + $150 shipping = $3650.00
      expect(result.currency).toBe("USD");

      // Verify order status transitioned to awaiting_payment
      const updatedOrder = await getExportOrder(orderId);
      expect(updatedOrder?.status).toBe("awaiting_payment");
      expect(updatedOrder?.payment?.paypal_order_id).toBe(result.paypal_order_id);
      expect(updatedOrder?.payment?.status).toBe("CREATED");
    });

    it("recalculates totals on the server and rejects tampering", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001";
      const order = getMockOrder(orderId)!;

      // Simulate malicious client attempting to set total_minor to $1.00 (100 cents)
      order.total_minor = 100;
      setMockOrder(order);

      const result = await createPayPalOrder(orderId);

      // Server must recompute directly from 100 * $35.00 + $150.00 shipping = $3650.00
      expect(result.amount_minor).toBe(365000);
      const rechecked = await getExportOrder(orderId);
      expect(rechecked?.total_minor).toBe(365000);
    });

    it("rejects order creation if seller has not approved quote (status is draft)", async () => {
      const draftOrderId = "e1000000-0000-4000-a000-000000000004"; // Draft chess sets
      await expect(createPayPalOrder(draftOrderId)).rejects.toThrow(
        /must be in 'quoted' status with seller approval/i
      );
    });

    it("rejects order creation if an item has zero or missing unit price", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001";
      const order = getMockOrder(orderId)!;
      order.items![0].unit_price_minor = 0;
      setMockOrder(order);

      await expect(createPayPalOrder(orderId)).rejects.toThrow(
        /has no approved unit price/i
      );
    });

    it("rejects non-existent order ID with 404", async () => {
      await expect(createPayPalOrder("non-existent-order-id")).rejects.toThrow(
        /does not exist in the system/i
      );
    });
  });

  // ===========================================================================
  // 3. Server-Side Capture & Idempotency
  // ===========================================================================
  describe("Server-Side Capture & Idempotency", () => {
    it("captures an approved PayPal order with idempotency header", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001";
      const created = await createPayPalOrder(orderId);

      const captureResponse = await capturePayPalOrder(
        created.paypal_order_id,
        `${orderId}-capture-idempotent-key`
      );

      expect(captureResponse.status).toBe("COMPLETED");
      expect(captureResponse.idempotency_key).toBe(`${orderId}-capture-idempotent-key`);
      const captureItem = captureResponse.purchase_units[0].payments.captures[0];
      expect(captureItem.status).toBe("COMPLETED");
      expect(captureItem.id).toBeDefined();
    });

    it("rejects capture with invalid paypal_order_id", async () => {
      await expect(capturePayPalOrder("")).rejects.toThrow(
        /A valid paypal_order_id must be provided/i
      );
    });
  });

  // ===========================================================================
  // 4. Webhook Signature Verification Logic
  // ===========================================================================
  describe("Webhook Signature Verification Logic", () => {
    const validHeaders = {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123",
      "paypal-transmission-id": "trans-test-12345",
      "paypal-transmission-sig": "VALID_SIGNATURE_BASE64",
      "paypal-transmission-time": "2026-11-09T12:00:00Z",
    };

    const sampleBody = {
      id: "WH-EVENT-001",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "CAP-001" },
    };

    it("extracts and normalizes transmission headers regardless of case", () => {
      const mixedCaseHeaders = {
        "PayPal-Auth-Algo": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123",
        "paypal-transmission-id": "trans-test-12345",
        "paypal-transmission-sig": "VALID_SIGNATURE_BASE64",
        "paypal-transmission-time": "2026-11-09T12:00:00Z",
      };

      const extracted = extractWebhookHeaders(mixedCaseHeaders);
      expect(extracted).not.toBeNull();
      expect(extracted?.authAlgo).toBe("SHA256withRSA");
      expect(extracted?.transmissionId).toBe("trans-test-12345");
    });

    it("fails when any transmission header is missing", async () => {
      const incompleteHeaders = { ...validHeaders };
      delete (incompleteHeaders as any)["paypal-transmission-sig"];

      const result = await verifyWebhookSignature(incompleteHeaders, sampleBody);
      expect(result.verified).toBe(false);
      expect(result.status).toBe("FAILURE");
      expect(result.error).toContain("Missing required PayPal transmission headers");
    });

    it("returns SUCCESS when signature verification succeeds", async () => {
      const result = await verifyWebhookSignature(validHeaders, sampleBody);
      expect(result.verified).toBe(true);
      expect(result.status).toBe("SUCCESS");
    });

    it("returns FAILURE when PayPal signature is invalid", async () => {
      const invalidHeaders = {
        ...validHeaders,
        "paypal-transmission-sig": "INVALID_SIGNATURE",
      };

      const result = await verifyWebhookSignature(invalidHeaders, sampleBody);
      expect(result.verified).toBe(false);
      expect(result.status).toBe("FAILURE");
    });
  });

  // ===========================================================================
  // 5. Webhook Deduplication
  // ===========================================================================
  describe("Webhook Event Deduplication", () => {
    const headers = {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/certs/cert",
      "paypal-transmission-id": "trans-001",
      "paypal-transmission-sig": "SIG-VALID",
      "paypal-transmission-time": "2026-11-09T12:00:00Z",
    };

    const webhookPayload = {
      id: "WH-DEDUP-UNIQUE-001",
      event_type: "CHECKOUT.ORDER.APPROVED",
      resource: {
        id: "5X89234120938471K",
        purchase_units: [{ custom_id: "e1000000-0000-4000-a000-000000000001" }],
      },
    };

    it("processes new webhook event on first delivery", async () => {
      const first = await processPayPalWebhook(headers, webhookPayload);
      expect(first.received).toBe(true);
      expect(first.status).toBe("processed");
      expect(first.event_id).toBe("WH-DEDUP-UNIQUE-001");
    });

    it("safely rejects duplicate event on second delivery without re-executing", async () => {
      const first = await processPayPalWebhook(headers, webhookPayload);
      expect(first.status).toBe("processed");

      // Replay the exact same event
      const replay = await processPayPalWebhook(headers, webhookPayload);
      expect(replay.received).toBe(true);
      expect(replay.status).toBe("duplicate");
      expect(replay.event_id).toBe("WH-DEDUP-UNIQUE-001");
    });
  });

  // ===========================================================================
  // 6. Strict 4-Way Payment Reconciliation Guardrail
  // ===========================================================================
  describe("4-Way Payment Reconciliation Guardrail", () => {
    const mockOrder: ExportOrder = {
      id: "e1000000-0000-4000-a000-000000000001",
      owner_id: "u1",
      buyer_id: "b1",
      order_number: "EXP-2026-001",
      source_message: "100 leather wallets",
      destination_country: "AE",
      currency: "USD",
      subtotal_minor: 350000,
      shipping_minor: 15000,
      tax_minor: 0,
      total_minor: 365000,
      status: "awaiting_payment",
      ai_extraction: {} as any,
      ai_confidence: 0.95,
      seller_notes: null,
      seller_approved_at: "2026-02-09T10:00:00Z",
      created_at: "2026-02-09T09:30:00Z",
      updated_at: "2026-02-09T10:00:00Z",
    };

    const mockPayment: PayPalPayment = {
      id: "p1",
      order_id: mockOrder.id,
      paypal_order_id: "PAYPAL-ORDER-12345",
      paypal_capture_id: null,
      status: "CREATED",
      amount_minor: 365000,
      currency: "USD",
      approval_url: "https://sandbox.paypal.com",
      payer_email: null,
      payer_id: null,
      created_at: "2026-02-09T10:00:00Z",
      captured_at: null,
      updated_at: "2026-02-09T10:00:00Z",
    };

    it("passes reconciliation when all 4 invariants match perfectly", () => {
      const captureResource = {
        id: "CAP-12345",
        custom_id: mockOrder.id,
        amount: {
          currency_code: "USD",
          value: "3650.00",
        },
        supplementary_data: {
          related_ids: {
            order_id: "PAYPAL-ORDER-12345",
          },
        },
      };

      const result = reconcilePayment({
        order: mockOrder,
        payment: mockPayment,
        captureResource,
      });

      expect(result.reconciled).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.orderIdMatch).toBe(true);
      expect(result.details.paypalOrderIdMatch).toBe(true);
      expect(result.details.amountMatch).toBe(true);
      expect(result.details.currencyMatch).toBe(true);
      expect(result.details.capturedAmountMinor).toBe(365000);
    });

    it("fails Invariant 1: custom_id does not match internal order ID", () => {
      const captureResource = {
        id: "CAP-12345",
        custom_id: "DIFFERENT-ORDER-UUID",
        amount: {
          currency_code: "USD",
          value: "3650.00",
        },
        supplementary_data: {
          related_ids: {
            order_id: "PAYPAL-ORDER-12345",
          },
        },
      };

      const result = reconcilePayment({
        order: mockOrder,
        payment: mockPayment,
        captureResource,
      });

      expect(result.reconciled).toBe(false);
      expect(result.details.orderIdMatch).toBe(false);
      expect(result.errors.some((e) => e.includes("Internal Order ID mismatch"))).toBe(true);
    });

    it("fails Invariant 2: PayPal Order ID does not match stored payment record", () => {
      const captureResource = {
        id: "CAP-12345",
        custom_id: mockOrder.id,
        amount: {
          currency_code: "USD",
          value: "3650.00",
        },
        supplementary_data: {
          related_ids: {
            order_id: "DIFFERENT-PAYPAL-ORDER-ID",
          },
        },
      };

      const result = reconcilePayment({
        order: mockOrder,
        payment: mockPayment,
        captureResource,
      });

      expect(result.reconciled).toBe(false);
      expect(result.details.paypalOrderIdMatch).toBe(false);
      expect(result.errors.some((e) => e.includes("PayPal Order ID mismatch"))).toBe(true);
    });

    it("fails Invariant 3: Captured amount does not match order total in minor units", () => {
      const captureResource = {
        id: "CAP-12345",
        custom_id: mockOrder.id,
        amount: {
          currency_code: "USD",
          value: "3500.00", // $3,500.00 instead of $3,650.00
        },
        supplementary_data: {
          related_ids: {
            order_id: "PAYPAL-ORDER-12345",
          },
        },
      };

      const result = reconcilePayment({
        order: mockOrder,
        payment: mockPayment,
        captureResource,
      });

      expect(result.reconciled).toBe(false);
      expect(result.details.amountMatch).toBe(false);
      expect(result.details.capturedAmountMinor).toBe(350000);
      expect(result.details.expectedAmountMinor).toBe(365000);
      expect(result.errors.some((e) => e.includes("Amount mismatch"))).toBe(true);
    });

    it("fails Invariant 4: Currency code mismatch", () => {
      const captureResource = {
        id: "CAP-12345",
        custom_id: mockOrder.id,
        amount: {
          currency_code: "EUR", // EUR instead of USD
          value: "3650.00",
        },
        supplementary_data: {
          related_ids: {
            order_id: "PAYPAL-ORDER-12345",
          },
        },
      };

      const result = reconcilePayment({
        order: mockOrder,
        payment: mockPayment,
        captureResource,
      });

      expect(result.reconciled).toBe(false);
      expect(result.details.currencyMatch).toBe(false);
      expect(result.errors.some((e) => e.includes("Currency mismatch"))).toBe(true);
    });
  });

  // ===========================================================================
  // 7. Full End-to-End Webhook Reconciliation Lifecycle
  // ===========================================================================
  describe("End-to-End Webhook Reconciliation Lifecycle", () => {
    const headers = {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/certs/cert",
      "paypal-transmission-id": "trans-e2e-001",
      "paypal-transmission-sig": "VALID_SIG",
      "paypal-transmission-time": "2026-11-09T12:00:00Z",
    };

    it("successfully reconciles PAYMENT.CAPTURE.COMPLETED and marks order paid", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001";
      const created = await createPayPalOrder(orderId);

      const captureWebhookBody = {
        id: "WH-E2E-CAP-001",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-E2E-123",
          custom_id: orderId,
          amount: {
            currency_code: "USD",
            value: "3650.00",
          },
          supplementary_data: {
            related_ids: {
              order_id: created.paypal_order_id,
            },
          },
          create_time: new Date().toISOString(),
        },
      };

      const result = await processPayPalWebhook(headers, captureWebhookBody);
      expect(result.received).toBe(true);
      expect(result.status).toBe("processed");
      expect(result.reconciliation?.reconciled).toBe(true);

      // Verify order is now paid
      const order = await getExportOrder(orderId);
      expect(order?.status).toBe("paid");
      expect(order?.payment?.status).toBe("COMPLETED");
      expect(order?.payment?.paypal_capture_id).toBe("CAP-E2E-123");
    });

    it("marks order needs_review when reconciliation fails (amount mismatch)", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001";
      const created = await createPayPalOrder(orderId);

      const maliciousCaptureBody = {
        id: "WH-E2E-TAMPER-001",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-MALICIOUS-123",
          custom_id: orderId,
          amount: {
            currency_code: "USD",
            value: "100.00", // Tampered amount
          },
          supplementary_data: {
            related_ids: {
              order_id: created.paypal_order_id,
            },
          },
        },
      };

      const result = await processPayPalWebhook(headers, maliciousCaptureBody);
      expect(result.reconciliation?.reconciled).toBe(false);

      // Order must NOT be marked paid; should be moved to needs_review
      const order = await getExportOrder(orderId);
      expect(order?.status).toBe("needs_review");
    });
  });

  // ===========================================================================
  // 8. Next.js API Route Handlers Integration
  // ===========================================================================
  describe("API Route Handlers Integration", () => {
    it("POST /api/paypal/create-order returns 200 with approval url for quoted order", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001";
      const req = new NextRequest("http://localhost:3000/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.paypal_order_id).toBeDefined();
      expect(data.approve_url).toContain("token=");
      expect(data.amount_minor).toBe(365000);
      expect(data.currency).toBe("USD");
    });

    it("POST /api/paypal/create-order returns 400 for unapproved draft order", async () => {
      const draftId = "e1000000-0000-4000-a000-000000000004";
      const req = new NextRequest("http://localhost:3000/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: draftId }),
      });

      const res = await createOrderRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/quoted/i);
    });

    it("POST /api/paypal/capture-order returns 200 and reconciles payment", async () => {
      const orderId = "e1000000-0000-4000-a000-000000000001";
      const createRes = await createPayPalOrder(orderId);

      const req = new NextRequest("http://localhost:3000/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          paypal_order_id: createRes.paypal_order_id,
        }),
      });

      const res = await captureOrderRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.reconciled).toBe(true);
      expect(data.status).toBe("COMPLETED");
      expect(data.order_status).toBe("paid");
      expect(data.capture_id).toBeDefined();
    });

    it("POST /api/paypal/webhook returns 200 for valid event and 400 for bad signature", async () => {
      const validHeaders = new Headers({
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://api.sandbox.paypal.com/certs/cert",
        "paypal-transmission-id": "wh-route-001",
        "paypal-transmission-sig": "VALID_SIGNATURE",
        "paypal-transmission-time": "2026-11-09T12:00:00Z",
      });

      const validReq = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        headers: validHeaders,
        body: JSON.stringify({
          id: "WH-ROUTE-EVT-01",
          event_type: "CHECKOUT.ORDER.APPROVED",
          resource: { id: "5X89234120938471K" },
        }),
      });

      const validRes = await webhookRoute(validReq);
      expect(validRes.status).toBe(200);
      const validData = await validRes.json();
      expect(validData.received).toBe(true);
      expect(validData.status).toBe("processed");

      // Invalid signature
      const invalidHeaders = new Headers({
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://api.sandbox.paypal.com/certs/cert",
        "paypal-transmission-id": "wh-route-002",
        "paypal-transmission-sig": "INVALID_SIGNATURE",
        "paypal-transmission-time": "2026-11-09T12:00:00Z",
      });

      const invalidReq = new NextRequest("http://localhost:3000/api/paypal/webhook", {
        method: "POST",
        headers: invalidHeaders,
        body: JSON.stringify({
          id: "WH-ROUTE-EVT-02",
          event_type: "CHECKOUT.ORDER.APPROVED",
          resource: { id: "5X89234120938471K" },
        }),
      });

      const invalidRes = await webhookRoute(invalidReq);
      expect(invalidRes.status).toBe(400);
      const invalidData = await invalidRes.json();
      expect(invalidData.received).toBe(false);
      expect(invalidData.status).toBe("failed");
    });
  });
});
