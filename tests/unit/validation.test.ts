import { describe, it, expect } from "vitest";
import {
  AIExtractionResultSchema,
  CreateOrderRequestSchema,
  UpdateQuotationRequestSchema,
  CapturePaymentRequestSchema,
  ParseOrderRequestSchema,
} from "@/lib/validation/order";
import { AUTHORITATIVE_UAE_EXTRACTION } from "@/lib/mock-data";

describe("Validation Schemas (Zod)", () => {
  describe("AIExtractionResultSchema", () => {
    it("successfully validates the authoritative UAE buyer extraction", () => {
      const parsed = AIExtractionResultSchema.safeParse(AUTHORITATIVE_UAE_EXTRACTION);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.buyer_name).toBe("Tariq Al-Mansoor");
        expect(parsed.data.destination_country).toBe("AE");
        expect(parsed.data.items[0].quantity).toBe(100);
        expect(parsed.data.items[0].unit_price_minor).toBeNull(); // Missing price is null
        expect(parsed.data.missing_fields).toContain("unit_price_minor");
      }
    });

    it("rejects extraction with empty items array", () => {
      const invalid = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [],
      };
      const result = AIExtractionResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid email address format when provided", () => {
      const invalid = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        buyer_email: "not-an-email",
      };
      const result = AIExtractionResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateQuotationRequestSchema", () => {
    it("validates valid quotation updates", () => {
      const validQuote = {
        items: [
          {
            description: "Handcrafted genuine leather wallets",
            sku: "HW-WL-01",
            quantity: 100,
            unit_price_minor: 3500, // $35.00
          },
        ],
        shipping_minor: 15000, // $150.00
        tax_minor: 0,
        incoterm: "FOB",
        seller_notes: "Approved special export quote",
      };

      const result = UpdateQuotationRequestSchema.safeParse(validQuote);
      expect(result.success).toBe(true);
    });

    it("rejects negative unit prices and negative shipping fees", () => {
      const invalidQuote = {
        items: [
          {
            description: "Wallets",
            quantity: 100,
            unit_price_minor: -100,
          },
        ],
        shipping_minor: -50,
      };

      const result = UpdateQuotationRequestSchema.safeParse(invalidQuote);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateOrderRequestSchema", () => {
    it("validates presence of order_id", () => {
      expect(CreateOrderRequestSchema.safeParse({ order_id: "e1000-001" }).success).toBe(true);
      expect(CreateOrderRequestSchema.safeParse({ order_id: "" }).success).toBe(false);
      expect(CreateOrderRequestSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("CapturePaymentRequestSchema", () => {
    it("validates presence of both order_id and paypal_order_id", () => {
      const valid = {
        order_id: "e1000-001",
        paypal_order_id: "5X89234120938471K",
      };
      expect(CapturePaymentRequestSchema.safeParse(valid).success).toBe(true);

      expect(CapturePaymentRequestSchema.safeParse({ order_id: "e1000-001" }).success).toBe(false);
      expect(CapturePaymentRequestSchema.safeParse({ paypal_order_id: "5X..." }).success).toBe(false);
    });
  });

  describe("ParseOrderRequestSchema", () => {
    it("accepts valid enquiry texts and assigns default provider", () => {
      const valid = { text: "We need 100 wallets shipped to Dubai" };
      const parsed = ParseOrderRequestSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.provider).toBe("auto");
      }
    });

    it("rejects too short inquiry strings (< 5 chars)", () => {
      expect(ParseOrderRequestSchema.safeParse({ text: "Hi" }).success).toBe(false);
    });
  });
});
