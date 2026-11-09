import { describe, it, expect, beforeEach } from "vitest";
import { ExportPilotTestHarness } from "./harness";
import {
  AUTHORITATIVE_UAE_ENQUIRY_TEXT,
  AUTHORITATIVE_UAE_EXTRACTION,
} from "@/lib/mock-data";
import { formatMoney, minorToDecimalString } from "@/lib/money";

describe("E2E Order Lifecycle & Quotation Management (Tiers 1, 2, 4)", () => {
  let harness: ExportPilotTestHarness;

  beforeEach(() => {
    harness = new ExportPilotTestHarness();
  });

  // ===========================================================================
  // Tier 1: Functional Feature Coverage (Category-Partition)
  // ===========================================================================
  describe("Tier 1: Functional Feature Coverage", () => {
    it("parses raw enquiry text and flags missing unit price and shipping", async () => {
      const enquiry = "We need 50 wooden tables shipped to Frankfurt, Germany. Please send a quote.";
      const res = await harness.parseOrder({ text: enquiry });

      expect(res.success).toBe(true);
      expect(res.data.items.length).toBeGreaterThan(0);
      expect(res.data.items[0].quantity).toBe(50);
      expect(res.data.destination_country).toBe("DE");
      expect(res.data.items[0].unit_price_minor).toBeNull();
      expect(res.missing_fields).toContain("unit_price_minor");
      expect(res.missing_fields).toContain("shipping_minor");
    });

    it("creates an order draft from inquiry with status 'draft' and minor unit totals 0", async () => {
      const enquiry = "We need 20 ceramic vases for our London boutique. Email: info@londonboutique.co.uk";
      const order = await harness.createOrderFromEnquiry(enquiry, {
        name: "London Boutique Imports",
        country_code: "GB",
      });

      expect(order.id).toBeDefined();
      expect(order.order_number).toMatch(/^EXP-2026-\d{3}$/);
      expect(order.status).toBe("draft");
      expect(order.total_minor).toBe(0);
      expect(order.subtotal_minor).toBe(0);
      expect(order.shipping_minor).toBe(0);
      expect(order.items?.length).toBe(1);
      expect(order.activity_events?.length).toBe(1);
      expect(order.activity_events?.[0].event_type).toBe("inquiry_received");
    });

    it("allows seller to adjust quotation items, shipping, tax and auto-recalculates totals", async () => {
      const order = await harness.createOrderFromEnquiry(
        "Requesting quote for 10 decorative bronze lamps shipped to New York."
      );

      const updated = await harness.updateQuotation(order.id, {
        items: [
          {
            description: "Decorative bronze lamps",
            sku: "BRZ-LMP-01",
            quantity: 10,
            unit_price_minor: 8500, // $85.00
          },
        ],
        shipping_minor: 5000, // $50.00
        tax_minor: 2000, // $20.00
        incoterm: "DAP",
        seller_notes: "Air freight delivery to JFK New York.",
      });

      expect(updated.subtotal_minor).toBe(85000); // 10 * 8500 = $850.00
      expect(updated.shipping_minor).toBe(5000); // $50.00
      expect(updated.tax_minor).toBe(2000); // $20.00
      expect(updated.total_minor).toBe(92000); // $920.00
      expect(updated.incoterm).toBe("DAP");
      expect(updated.items?.[0].line_total_minor).toBe(85000);
    });

    it("transitions order status from 'draft' to 'quoted' upon explicit seller approval", async () => {
      const order = await harness.createOrderFromEnquiry(
        "Please quote 5 cashmere scarves to Tokyo, Japan."
      );

      await harness.updateQuotation(order.id, {
        items: [
          {
            description: "Cashmere scarves",
            quantity: 5,
            unit_price_minor: 12000, // $120.00
          },
        ],
        shipping_minor: 3000, // $30.00
        tax_minor: 0,
      });

      const approved = await harness.approveQuotation(order.id, "Quote verified and approved for export.");

      expect(approved.status).toBe("quoted");
      expect(approved.seller_approved_at).not.toBeNull();
      expect(approved.seller_notes).toBe("Quote verified and approved for export.");

      const activities = harness.getActivityEvents(order.id);
      expect(activities.some((a) => a.event_type === "quote_approved")).toBe(true);
    });
  });

  // ===========================================================================
  // Tier 2: Boundary Value Analysis & Corner Cases
  // ===========================================================================
  describe("Tier 2: Boundary Value Analysis & Corner Cases", () => {
    it("rejects zero quantity item in quotation update", async () => {
      const order = await harness.createOrderFromEnquiry("Order enquiry for leather jackets.");

      await expect(
        harness.updateQuotation(order.id, {
          items: [
            {
              description: "Leather jackets",
              quantity: 0, // Boundary violation
              unit_price_minor: 15000,
            },
          ],
          shipping_minor: 1000,
          tax_minor: 0,
        })
      ).rejects.toThrow(/greater than zero|positive/i);
    });

    it("rejects negative item quantity in quotation update", async () => {
      const order = await harness.createOrderFromEnquiry("Order enquiry for leather belts.");

      await expect(
        harness.updateQuotation(order.id, {
          items: [
            {
              description: "Leather belts",
              quantity: -5,
              unit_price_minor: 2500,
            },
          ],
          shipping_minor: 1000,
          tax_minor: 0,
        })
      ).rejects.toThrow();
    });

    it("rejects negative unit price in quotation update", async () => {
      const order = await harness.createOrderFromEnquiry("Order enquiry for leather shoes.");

      await expect(
        harness.updateQuotation(order.id, {
          items: [
            {
              description: "Leather shoes",
              quantity: 10,
              unit_price_minor: -500, // Negative price attempt
            },
          ],
          shipping_minor: 1000,
          tax_minor: 0,
        })
      ).rejects.toThrow(/negative/i);
    });

    it("rejects approving a quotation when total is 0 or unit price is missing", async () => {
      const order = await harness.createOrderFromEnquiry("Inquiry without price.");

      // Attempting to approve draft directly without setting unit price
      await expect(harness.approveQuotation(order.id)).rejects.toThrow(/zero|missing unit price/i);
    });

    it("handles large quantities and prices without IEEE 754 precision loss", async () => {
      const order = await harness.createOrderFromEnquiry("Bulk industrial export inquiry.");

      const updated = await harness.updateQuotation(order.id, {
        items: [
          {
            description: "Industrial Precision Bearings",
            quantity: 50000,
            unit_price_minor: 4999, // $49.99
          },
        ],
        shipping_minor: 250000, // $2,500.00
        tax_minor: 124975, // $1,249.75
      });

      // 50,000 * 4999 = 249,950,000 cents ($2,499,500.00)
      expect(updated.subtotal_minor).toBe(249950000);
      expect(updated.shipping_minor).toBe(250000);
      expect(updated.tax_minor).toBe(124975);
      expect(updated.total_minor).toBe(250324975); // $2,503,249.75
      expect(minorToDecimalString(updated.total_minor)).toBe("2503249.75");
    });

    it("handles empty buyer address safely without runtime crashes", async () => {
      const order = await harness.createOrderFromEnquiry("Enquiry from minimalist buyer.", {
        name: "Minimal Buyer",
        address: {}, // Completely empty address object
      });

      expect(order.buyer?.address).toEqual({});
      expect(order.status).toBe("draft");
    });

    it("handles massive 50,000-character enquiry text without throwing", async () => {
      const longText = "Genuine Leather Craft Enquiry. ".repeat(1600); // ~51,200 chars
      const res = await harness.parseOrder({ text: longText });

      expect(res.success).toBe(true);
      expect(res.data.items.length).toBeGreaterThan(0);
    });

    it("handles Arabic text and special Unicode characters cleanly", async () => {
      const arabicInquiry =
        "مرحبا، أنا طارق المنصور من شركة المنصور للبضائع الفاخرة، دبي. نود طلب 100 محفظة جلدية فاخرة.";
      const res = await harness.parseOrder({ text: arabicInquiry });

      expect(res.success).toBe(true);
      expect(res.data.items.length).toBeGreaterThan(0);
      expect(res.data.items[0].quantity).toBe(100);
      expect(res.data.destination_country).toBe("AE");
    });
  });

  // ===========================================================================
  // Tier 4: Real-World Workload (Authoritative UAE Buyer Scenario)
  // ===========================================================================
  describe("Tier 4: Real-World Workload (Authoritative UAE Scenario)", () => {
    it("executes the exact UAE inquiry scenario: Tariq Al-Mansoor, 100 leather wallets, $35.00/unit, $150 shipping, total $3,650.00 USD", async () => {
      // 1. AI Parsing of the exact UAE enquiry text
      const parseResponse = await harness.parseOrder({ text: AUTHORITATIVE_UAE_ENQUIRY_TEXT });
      expect(parseResponse.success).toBe(true);
      expect(parseResponse.data.buyer_name).toBe("Tariq Al-Mansoor");
      expect(parseResponse.data.buyer_company).toBe("Al-Mansoor Luxury Goods LLC");
      expect(parseResponse.data.destination_country).toBe("AE");
      expect(parseResponse.data.items[0].description).toBe("Handcrafted genuine leather wallets");
      expect(parseResponse.data.items[0].sku).toBe("HW-WL-01");
      expect(parseResponse.data.items[0].quantity).toBe(100);
      expect(parseResponse.data.incoterm).toBe("FOB");
      expect(parseResponse.missing_fields).toEqual(["unit_price_minor", "shipping_minor"]);

      // 2. Exporter creates draft order
      const order = await harness.createOrderFromEnquiry(AUTHORITATIVE_UAE_ENQUIRY_TEXT, {
        name: "Tariq Al-Mansoor",
        company_name: "Al-Mansoor Luxury Goods LLC",
        country_code: "AE",
        email: "tariq.mansoor@almansoor-luxury.ae",
        address: {
          street: "Suite 402, Al-Rigga Commercial Tower",
          city: "Dubai",
          port_of_entry: "DXB Air Cargo Terminal",
        },
      });

      expect(order.status).toBe("draft");
      expect(order.destination_country).toBe("AE");

      // 3. Exporter configures pricing: $35.00 per unit + $150.00 air freight
      const quotedOrder = await harness.updateQuotation(order.id, {
        items: [
          {
            description: "Handcrafted genuine leather wallets (Item code: HW-WL-01)",
            sku: "HW-WL-01",
            quantity: 100,
            unit_price_minor: 3500, // $35.00
          },
        ],
        shipping_minor: 15000, // $150.00 air freight
        tax_minor: 0, // Export zero-rated
        incoterm: "FOB",
        seller_notes: "Approved special export pricing for 100 leather wallets @ $35.00/unit with express air cargo to DXB.",
      });

      expect(quotedOrder.subtotal_minor).toBe(350000); // $3,500.00
      expect(quotedOrder.shipping_minor).toBe(15000); // $150.00
      expect(quotedOrder.tax_minor).toBe(0);
      expect(quotedOrder.total_minor).toBe(365000); // $3,650.00
      expect(formatMoney(quotedOrder.total_minor, "USD")).toBe("$3,650.00");

      // 4. Seller approves quotation snapshot
      const approvedOrder = await harness.approveQuotation(order.id);
      expect(approvedOrder.status).toBe("quoted");
      expect(approvedOrder.seller_approved_at).not.toBeNull();
      expect(approvedOrder.total_minor).toBe(365000);

      // Verify buyer information preserved
      expect(approvedOrder.buyer?.name).toBe("Tariq Al-Mansoor");
      expect(approvedOrder.buyer?.country_code).toBe("AE");
      expect((approvedOrder.buyer?.address as any).port_of_entry).toBe("DXB Air Cargo Terminal");
    });
  });
});
