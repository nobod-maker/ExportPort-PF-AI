import { describe, it, expect, beforeEach } from "vitest";
import { ExportPilotTestHarness } from "./harness";
import { minorToDecimalString, formatMoney } from "@/lib/money";

describe("E2E PayPal Orders v2 Lifecycle & Cross-Feature Integration (Tiers 1, 3)", () => {
  let harness: ExportPilotTestHarness;

  beforeEach(() => {
    harness = new ExportPilotTestHarness();
  });

  // ===========================================================================
  // Tier 1: Functional Feature Coverage (PayPal Checkout & Webhook)
  // ===========================================================================
  describe("Tier 1: PayPal Checkout, Capture & Webhook Verification", () => {
    it("creates PayPal Orders v2 Sandbox checkout for an approved quote", async () => {
      // Seed authoritative approved UAE order
      const order = harness.seedAuthoritativeUAEOrder();
      expect(order.status).toBe("quoted");

      const checkoutRes = await harness.createPayPalOrder({ order_id: order.id });

      expect(checkoutRes.success).toBe(true);
      expect(checkoutRes.paypal_order_id).toMatch(/^PAYPAL-\d+-SANDBOX$/);
      expect(checkoutRes.approve_url).toContain("https://www.sandbox.paypal.com/checkoutnow?token=");
      expect(checkoutRes.amount_minor).toBe(365000); // $3,650.00
      expect(checkoutRes.currency).toBe("USD");

      // Verify order transitioned to awaiting_payment
      const updatedOrder = harness.getOrder(order.id);
      expect(updatedOrder?.status).toBe("awaiting_payment");

      // Verify payment record in DB
      const payment = harness.getPayment(checkoutRes.paypal_order_id);
      expect(payment).not.toBeNull();
      expect(payment?.status).toBe("CREATED");
      expect(payment?.amount_minor).toBe(365000);
      expect(payment?.currency).toBe("USD");
    });

    it("captures payment server-side and marks order paid", async () => {
      const order = harness.seedAuthoritativeUAEOrder();
      const checkoutRes = await harness.createPayPalOrder({ order_id: order.id });

      const captureRes = await harness.capturePayPalOrder({
        order_id: order.id,
        paypal_order_id: checkoutRes.paypal_order_id,
      });

      expect(captureRes.success).toBe(true);
      expect(captureRes.capture_id).toMatch(/^CAP-\d+-SANDBOX$/);
      expect(captureRes.status).toBe("COMPLETED");
      expect(captureRes.reconciled).toBe(true);
      expect(captureRes.order_status).toBe("paid");
      expect(captureRes.amount_captured).toBe("3650.00");
      expect(captureRes.currency).toBe("USD");

      // Verify DB state
      const finalOrder = harness.getOrder(order.id);
      expect(finalOrder?.status).toBe("paid");
      expect(finalOrder?.payment?.status).toBe("COMPLETED");
      expect(finalOrder?.payment?.paypal_capture_id).toBe(captureRes.capture_id);
    });

    it("processes valid PayPal webhook event and records in audit log", async () => {
      const order = harness.seedAuthoritativeUAEOrder();
      const checkoutRes = await harness.createPayPalOrder({ order_id: order.id });

      const webhookPayload = {
        id: "WH-EVT-1001-SANDBOX",
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource_type: "checkout-order",
        resource: {
          id: checkoutRes.paypal_order_id,
          status: "APPROVED",
          custom_id: order.id,
        },
      };

      const webhookHeaders = {
        "paypal-transmission-id": "trans-1001",
        "paypal-transmission-time": new Date().toISOString(),
        "paypal-cert-url": "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "VALID_MOCK_SIGNATURE_BASE64",
      };

      const webhookRes = await harness.processPayPalWebhook(webhookPayload, webhookHeaders);

      expect(webhookRes.received).toBe(true);
      expect(webhookRes.status).toBe("processed");
      expect(webhookRes.event_id).toBe("WH-EVT-1001-SANDBOX");

      const events = harness.getWebhookEvents();
      expect(events.some((e) => e.paypal_event_id === "WH-EVT-1001-SANDBOX")).toBe(true);
    });
  });

  // ===========================================================================
  // Tier 3: Cross-Feature Combinations (Full E2E Order-to-Payment Lifecycle)
  // ===========================================================================
  describe("Tier 3: Full End-to-End Cross-Feature Lifecycle", () => {
    it("completes full flow: Enquiry -> AI Parse -> Quote Edit -> Seller Approve -> PayPal Create -> Capture -> Webhook -> 4-Way Reconciliation", async () => {
      // 1. Raw Buyer Enquiry Received from Germany
      const enquiryText =
        "Greetings, this is Klaus Schmidt from Schmidt & Weber GmbH, Frankfurt, Germany. We require 200 units of Hand-turned Sheesham Wood Bowls. Please quote FOB USD price with sea freight to Hamburg Port.";

      // 2. AI Parse Order
      const parseResult = await harness.parseOrder({ text: enquiryText });
      expect(parseResult.success).toBe(true);
      expect(parseResult.data.destination_country).toBe("DE");
      expect(parseResult.data.items[0].quantity).toBe(200);
      expect(parseResult.missing_fields).toContain("unit_price_minor");

      // 3. Exporter creates draft order
      const order = await harness.createOrderFromEnquiry(enquiryText, {
        name: "Klaus Schmidt",
        company_name: "Schmidt & Weber GmbH",
        country_code: "DE",
        email: "klaus.schmidt@schmidt-weber.de",
      });
      expect(order.status).toBe("draft");
      expect(order.total_minor).toBe(0);

      // 4. Exporter configures quotation pricing
      // 200 units @ $22.50 = $4,500.00 (450,000 minor units)
      // Sea freight: $250.00 (25,000 minor units)
      // Export tax: 0
      // Total: $4,750.00 (475,000 minor units)
      const quoted = await harness.updateQuotation(order.id, {
        items: [
          {
            description: "Hand-turned Sheesham Wood Bowls",
            sku: "WD-BWL-02",
            quantity: 200,
            unit_price_minor: 2250, // $22.50
          },
        ],
        shipping_minor: 25000, // $250.00
        tax_minor: 0,
        incoterm: "FOB",
        seller_notes: "Packed in seaworthy corrugated cartons, CIF Hamburg.",
      });

      expect(quoted.subtotal_minor).toBe(450000);
      expect(quoted.shipping_minor).toBe(25000);
      expect(quoted.total_minor).toBe(475000);

      // 5. Seller approves quotation
      const approved = await harness.approveQuotation(order.id, "Approved pricing for German quarterly order.");
      expect(approved.status).toBe("quoted");
      expect(approved.seller_approved_at).not.toBeNull();

      // 6. Exporter generates PayPal Checkout
      const checkout = await harness.createPayPalOrder({ order_id: order.id });
      expect(checkout.success).toBe(true);
      expect(checkout.amount_minor).toBe(475000);
      expect(checkout.currency).toBe("USD");

      const awaitingOrder = harness.getOrder(order.id);
      expect(awaitingOrder?.status).toBe("awaiting_payment");

      // 7. Server executes PayPal capture upon buyer approval
      const capture = await harness.capturePayPalOrder({
        order_id: order.id,
        paypal_order_id: checkout.paypal_order_id,
      });

      expect(capture.success).toBe(true);
      expect(capture.status).toBe("COMPLETED");
      expect(capture.reconciled).toBe(true);
      expect(capture.amount_captured).toBe("4750.00");

      // 8. PayPal Webhook arrives: PAYMENT.CAPTURE.COMPLETED
      const webhookHeaders = {
        "paypal-transmission-id": "trans-e2e-2002",
        "paypal-transmission-time": new Date().toISOString(),
        "paypal-cert-url": "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "VALID_MOCK_SIGNATURE_BASE64",
      };

      const webhookPayload = {
        id: "WH-EVT-2002-CAPTURE-COMPLETED",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: capture.capture_id,
          custom_id: order.id,
          status: "COMPLETED",
          amount: {
            value: "4750.00",
            currency_code: "USD",
          },
        },
      };

      const webhookRes = await harness.processPayPalWebhook(webhookPayload, webhookHeaders);
      expect(webhookRes.received).toBe(true);
      expect(webhookRes.status).toBe("processed");

      // 9. Inspect finalized order state and 4-way reconciliation
      const finalOrder = harness.getOrder(order.id);
      expect(finalOrder).not.toBeNull();
      expect(finalOrder?.status).toBe("paid");
      expect(finalOrder?.total_minor).toBe(475000);
      expect(finalOrder?.payment?.status).toBe("COMPLETED");
      expect(finalOrder?.payment?.paypal_capture_id).toBe(capture.capture_id);

      // 10. Audit activity timeline contains chronological sequential trail
      const activities = harness.getActivityEvents(order.id);
      const eventTypes = activities.map((a) => a.event_type);

      expect(eventTypes).toContain("inquiry_received");
      expect(eventTypes).toContain("quote_approved");
      expect(eventTypes).toContain("checkout_created");
      expect(eventTypes).toContain("payment_captured");
      expect(eventTypes).toContain("webhook_reconciled");
    });

    it("verifies money formatting on checkout and capture receipts", async () => {
      const order = harness.seedAuthoritativeUAEOrder();
      const checkoutRes = await harness.createPayPalOrder({ order_id: order.id });

      const formattedTotal = formatMoney(checkoutRes.amount_minor, checkoutRes.currency);
      expect(formattedTotal).toBe("$3,650.00");

      const captureRes = await harness.capturePayPalOrder({
        order_id: order.id,
        paypal_order_id: checkoutRes.paypal_order_id,
      });

      expect(minorToDecimalString(checkoutRes.amount_minor)).toBe("3650.00");
      expect(captureRes.amount_captured).toBe("3650.00");
    });
  });
});
