import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredOrders,
  getStoredOrderById,
  createOrderFromExtraction,
  approveQuotation,
  recordPayPalCapture,
  resetOrdersToDefault,
} from "@/components/orders-store";
import { AUTHORITATIVE_UAE_EXTRACTION, AUTHORITATIVE_UAE_ENQUIRY_TEXT } from "@/lib/mock-data";
import { calculateOrderTotals, formatMoney } from "@/lib/money";

describe("Frontend Orders Store & Business Logic", () => {
  beforeEach(() => {
    resetOrdersToDefault();
  });

  it("should initialize orders store with 5 default seed orders", () => {
    const orders = getStoredOrders();
    expect(orders.length).toBeGreaterThanOrEqual(5);

    const uaeOrder = orders.find((o) => o.order_number === "EXP-2026-001");
    expect(uaeOrder).toBeDefined();
    expect(uaeOrder?.destination_country).toBe("AE");
    expect(uaeOrder?.total_minor).toBe(365000);
    expect(uaeOrder?.status).toBe("quoted");
  });

  it("should look up orders by UUID or order_number", () => {
    const byNumber = getStoredOrderById("EXP-2026-001");
    expect(byNumber).toBeDefined();
    expect(byNumber?.order_number).toBe("EXP-2026-001");

    if (byNumber) {
      const byId = getStoredOrderById(byNumber.id);
      expect(byId?.id).toBe(byNumber.id);
    }
  });

  it("should create draft ExportOrder from AI extraction result", () => {
    const draft = createOrderFromExtraction(
      AUTHORITATIVE_UAE_ENQUIRY_TEXT,
      AUTHORITATIVE_UAE_EXTRACTION
    );

    expect(draft.id).toBeDefined();
    expect(draft.order_number).toMatch(/^EXP-2026-\d{3}$/);
    expect(draft.status).toBe("draft");
    expect(draft.destination_country).toBe("AE");
    expect(draft.items?.length).toBe(1);
    expect(draft.items?.[0].quantity).toBe(100);
    expect(draft.activity_events?.length).toBeGreaterThanOrEqual(2);
  });

  it("should approve quotation, recompute minor units total, and transition status to quoted", () => {
    const draft = createOrderFromExtraction(
      AUTHORITATIVE_UAE_ENQUIRY_TEXT,
      AUTHORITATIVE_UAE_EXTRACTION
    );

    const approved = approveQuotation(draft.id, {
      items: [
        {
          description: "Handcrafted genuine leather wallets (Item code: HW-WL-01)",
          sku: "HW-WL-01",
          quantity: 100,
          unit_price_minor: 3500, // $35.00
        },
      ],
      shipping_minor: 15000, // $150.00
      tax_minor: 0,
      incoterm: "FOB",
      seller_notes: "Approved special export quote.",
    });

    expect(approved.status).toBe("quoted");
    expect(approved.subtotal_minor).toBe(350000); // $3,500.00
    expect(approved.shipping_minor).toBe(15000); // $150.00
    expect(approved.total_minor).toBe(365000); // $3,650.00
    expect(approved.seller_approved_at).toBeDefined();

    const lastEvent = approved.activity_events?.[approved.activity_events.length - 1];
    expect(lastEvent?.event_type).toBe("quote_approved");
    expect(lastEvent?.actor).toBe("seller");
  });

  it("should record PayPal capture and transition order to paid with capture ID", () => {
    const uaeOrder = getStoredOrderById("EXP-2026-001");
    expect(uaeOrder).toBeDefined();

    if (uaeOrder) {
      const captureId = "7H98234102938472M_TEST";
      const paypalOrderId = "SANDBOX_ORDER_999";
      const paidOrder = recordPayPalCapture(
        uaeOrder.id,
        paypalOrderId,
        captureId,
        "buyer@almansoor-luxury.ae"
      );

      expect(paidOrder.status).toBe("paid");
      expect(paidOrder.payment).toBeDefined();
      expect(paidOrder.payment?.paypal_capture_id).toBe(captureId);
      expect(paidOrder.payment?.paypal_order_id).toBe(paypalOrderId);
      expect(paidOrder.payment?.status).toBe("COMPLETED");

      const captureEvent = paidOrder.activity_events?.find(
        (e) => e.event_type === "payment_captured"
      );
      expect(captureEvent).toBeDefined();
      expect(captureEvent?.actor).toBe("paypal");
    }
  });

  it("should format minor money units accurately for UI without float drift", () => {
    expect(formatMoney(365000, "USD")).toBe("$3,650.00");
    expect(formatMoney(3500, "USD")).toBe("$35.00");
    expect(formatMoney(0, "USD")).toBe("$0.00");
    expect(formatMoney(7, "USD")).toBe("$0.07");
  });
});
