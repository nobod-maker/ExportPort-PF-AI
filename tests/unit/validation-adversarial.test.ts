import { describe, it, expect } from "vitest";
import {
  AIExtractionResultSchema,
  CreateOrderRequestSchema,
  CapturePaymentRequestSchema,
  UpdateQuotationRequestSchema,
  ParseOrderRequestSchema,
  IncotermEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
} from "@/lib/validation/order";
import { AUTHORITATIVE_UAE_EXTRACTION } from "@/lib/mock-data";

describe("Adversarial Stress Testing — Zod Validation Schemas", () => {
  describe("1. AIExtractionResultSchema — Malformed Inputs & Edge Cases", () => {
    it("rejects when required arrays are missing or null", () => {
      // items missing
      const noItems = { ...AUTHORITATIVE_UAE_EXTRACTION };
      delete (noItems as Record<string, unknown>).items;
      expect(AIExtractionResultSchema.safeParse(noItems).success).toBe(false);

      // items is null
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          items: null,
        }).success
      ).toBe(false);

      // missing_fields missing
      const noMissingFields = { ...AUTHORITATIVE_UAE_EXTRACTION };
      delete (noMissingFields as Record<string, unknown>).missing_fields;
      expect(AIExtractionResultSchema.safeParse(noMissingFields).success).toBe(false);

      // evidence_snippets missing
      const noEvidence = { ...AUTHORITATIVE_UAE_EXTRACTION };
      delete (noEvidence as Record<string, unknown>).evidence_snippets;
      expect(AIExtractionResultSchema.safeParse(noEvidence).success).toBe(false);
    });

    it("rejects string numbers without auto-coercion (strict typing check)", () => {
      // LLMs frequently output numbers as JSON strings: "100" instead of 100
      const stringQuantity = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
            quantity: "100" as unknown as number,
          },
        ],
      };
      const resQuantity = AIExtractionResultSchema.safeParse(stringQuantity);
      expect(resQuantity.success).toBe(false);

      // String unit_price_minor
      const stringPrice = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
            unit_price_minor: "3500" as unknown as number,
          },
        ],
      };
      expect(AIExtractionResultSchema.safeParse(stringPrice).success).toBe(false);

      // String shipping_minor
      const stringShipping = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        shipping_minor: "15000" as unknown as number,
      };
      expect(AIExtractionResultSchema.safeParse(stringShipping).success).toBe(false);

      // String confidence_score
      const stringConfidence = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        confidence_score: "0.95" as unknown as number,
      };
      expect(AIExtractionResultSchema.safeParse(stringConfidence).success).toBe(false);
    });

    it("rejects negative quantities, zero quantities, and floating-point quantities", () => {
      // Negative quantity
      const negQuantity = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
            quantity: -10,
          },
        ],
      };
      expect(AIExtractionResultSchema.safeParse(negQuantity).success).toBe(false);

      // Zero quantity (orders must have positive quantity)
      const zeroQuantity = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
            quantity: 0,
          },
        ],
      };
      expect(AIExtractionResultSchema.safeParse(zeroQuantity).success).toBe(false);

      // Float quantity (quantities must be integer)
      const floatQuantity = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
            quantity: 12.5,
          },
        ],
      };
      expect(AIExtractionResultSchema.safeParse(floatQuantity).success).toBe(false);

      // Non-finite quantity
      const nanQuantity = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
            quantity: NaN,
          },
        ],
      };
      expect(AIExtractionResultSchema.safeParse(nanQuantity).success).toBe(false);
    });

    it("rejects negative monetary amounts (shipping, tax, unit price, line total)", () => {
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          shipping_minor: -100,
        }).success
      ).toBe(false);

      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          tax_minor: -50,
        }).success
      ).toBe(false);

      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          items: [
            {
              ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
              unit_price_minor: -1,
            },
          ],
        }).success
      ).toBe(false);

      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          items: [
            {
              ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
              line_total_minor: -1,
            },
          ],
        }).success
      ).toBe(false);
    });

    it("tests currency code constraints and identifies length vs character format boundaries", () => {
      // Invalid lengths are rejected
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          currency: "US", // 2 chars
        }).success
      ).toBe(false);

      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          currency: "USDD", // 4 chars
        }).success
      ).toBe(false);

      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          currency: "",
        }).success
      ).toBe(false);

      // Currency is nullable (acceptable when unknown)
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          currency: null,
        }).success
      ).toBe(true);

      // NOTE: Current schema checks .length(3) but not regex /^[A-Z]{3}$/
      // Test behavior for lowercase and non-alpha 3-char strings:
      const lowercaseParsed = AIExtractionResultSchema.safeParse({
        ...AUTHORITATIVE_UAE_EXTRACTION,
        currency: "usd",
      });
      // Currently succeeds because z.string().length(3) doesn't enforce uppercase regex
      expect(lowercaseParsed.success).toBe(true);

      const numericCurrencyParsed = AIExtractionResultSchema.safeParse({
        ...AUTHORITATIVE_UAE_EXTRACTION,
        currency: "123",
      });
      // Succeeded under current schema (documenting finding)
      expect(numericCurrencyParsed.success).toBe(true);
    });

    it("tests destination country length boundaries", () => {
      // 3 chars rejected
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          destination_country: "UAE",
        }).success
      ).toBe(false);

      // 1 char rejected
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          destination_country: "U",
        }).success
      ).toBe(false);

      // Valid 2-letter country
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          destination_country: "AE",
        }).success
      ).toBe(true);

      // Nullable
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          destination_country: null,
        }).success
      ).toBe(true);
    });

    it("safely handles SQL injection strings in buyer_name and text fields", () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE buyers; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --",
        "1; WAITFOR DELAY '0:0:5'--",
      ];

      for (const payload of sqlInjectionPayloads) {
        const result = AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          buyer_name: payload,
          buyer_company: payload,
          notes: payload,
        });

        // Zod validates strings safely without executing or choking
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.buyer_name).toBe(payload);
        }
      }
    });

    it("tests XSS and HTML injection payloads in extraction result", () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
        "{{7*7}}",
        "${7*7}",
      ];

      for (const payload of xssPayloads) {
        const result = AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          buyer_name: payload,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.buyer_name).toBe(payload);
        }
      }
    });

    it("tests confidence score boundary conditions", () => {
      // Valid boundaries: 0 and 1
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          confidence_score: 0,
        }).success
      ).toBe(true);

      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          confidence_score: 1,
        }).success
      ).toBe(true);

      // Out of bounds: < 0 or > 1
      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          confidence_score: -0.01,
        }).success
      ).toBe(false);

      expect(
        AIExtractionResultSchema.safeParse({
          ...AUTHORITATIVE_UAE_EXTRACTION,
          confidence_score: 1.01,
        }).success
      ).toBe(false);
    });

    it("tests item description validation — rejects empty string", () => {
      const emptyDesc = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            ...AUTHORITATIVE_UAE_EXTRACTION.items[0],
            description: "",
          },
        ],
      };
      expect(AIExtractionResultSchema.safeParse(emptyDesc).success).toBe(false);
    });

    it("verifies missing price is preserved as null rather than fabricated", () => {
      // ORIGINAL_REQUEST: Never fabricate missing prices
      const nullPriceItem = {
        ...AUTHORITATIVE_UAE_EXTRACTION,
        items: [
          {
            description: "Handmade leather wallet",
            quantity: 100,
            unit_price_minor: null,
            line_total_minor: null,
          },
        ],
      };
      const parsed = AIExtractionResultSchema.safeParse(nullPriceItem);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items[0].unit_price_minor).toBeNull();
        expect(parsed.data.items[0].line_total_minor).toBeNull();
      }
    });

    it("tests incoterm enum validation", () => {
      // Valid incoterms
      const validTerms = ["FOB", "CIF", "EXW", "DDP", "FCA", "CPT", "CIP", "DAP", "DPU", "FAS", "CFR"];
      for (const term of validTerms) {
        expect(IncotermEnum.safeParse(term).success).toBe(true);
      }

      // Invalid incoterms
      expect(IncotermEnum.safeParse("UNKNOWN").success).toBe(false);
      expect(IncotermEnum.safeParse("fob").success).toBe(false); // Case sensitive
      expect(IncotermEnum.safeParse("").success).toBe(false);
    });
  });

  describe("2. CreateOrderRequestSchema — Tampering & Edge Cases", () => {
    it("validates well-formed internal order IDs", () => {
      expect(CreateOrderRequestSchema.safeParse({ order_id: "ord_1001" }).success).toBe(true);
      expect(
        CreateOrderRequestSchema.safeParse({ order_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }).success
      ).toBe(true);
    });

    it("rejects empty order_id", () => {
      expect(CreateOrderRequestSchema.safeParse({ order_id: "" }).success).toBe(false);
    });

    it("rejects missing order_id, null, or wrong data type", () => {
      expect(CreateOrderRequestSchema.safeParse({}).success).toBe(false);
      expect(CreateOrderRequestSchema.safeParse({ order_id: null }).success).toBe(false);
      expect(CreateOrderRequestSchema.safeParse({ order_id: 12345 }).success).toBe(false);
      expect(CreateOrderRequestSchema.safeParse({ order_id: ["ord_1"] }).success).toBe(false);
      expect(CreateOrderRequestSchema.safeParse({ order_id: { id: "1" } }).success).toBe(false);
    });

    it("analyzes whitespace-only order_id boundary", () => {
      // Note: z.string().min(1) treats "   " as length 3
      const whitespaceResult = CreateOrderRequestSchema.safeParse({ order_id: "   " });
      // Documents whether whitespace passes or is stripped
      expect(whitespaceResult.success).toBe(true);
      // Finding: whitespace string passes min(1) without .trim()
    });

    it("strips client-supplied tampering fields by default", () => {
      // Attack scenario: Malicious client attempts to pass price/status tampering in order creation
      const maliciousPayload = {
        order_id: "ord_1001",
        total_minor: 1, // Attempt to set order price to $0.01
        status: "paid", // Attempt to force paid status
        is_seller_approved: true,
      };

      const parsed = CreateOrderRequestSchema.safeParse(maliciousPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        // Zod stripping strips unauthorized extra fields
        expect((parsed.data as Record<string, unknown>).total_minor).toBeUndefined();
        expect((parsed.data as Record<string, unknown>).status).toBeUndefined();
        expect((parsed.data as Record<string, unknown>).is_seller_approved).toBeUndefined();
        expect(Object.keys(parsed.data)).toEqual(["order_id"]);
      }
    });

    it("handles prototype pollution payload attempts safely", () => {
      const maliciousJson = JSON.parse('{"order_id": "ord_1001", "__proto__": {"isAdmin": true}}');
      const parsed = CreateOrderRequestSchema.safeParse(maliciousJson);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.order_id).toBe("ord_1001");
        expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
      }
    });
  });

  describe("3. CapturePaymentRequestSchema — Tampering & Edge Cases", () => {
    it("validates presence of both order_id and paypal_order_id", () => {
      const valid = {
        order_id: "ord_1001",
        paypal_order_id: "5X89234120938471K",
      };
      expect(CapturePaymentRequestSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects when paypal_order_id is missing or empty", () => {
      expect(CapturePaymentRequestSchema.safeParse({ order_id: "ord_1001" }).success).toBe(false);
      expect(
        CapturePaymentRequestSchema.safeParse({ order_id: "ord_1001", paypal_order_id: "" }).success
      ).toBe(false);
      expect(
        CapturePaymentRequestSchema.safeParse({ order_id: "ord_1001", paypal_order_id: null }).success
      ).toBe(false);
    });

    it("rejects when order_id is missing or empty", () => {
      expect(
        CapturePaymentRequestSchema.safeParse({ paypal_order_id: "5X89234120938471K" }).success
      ).toBe(false);
      expect(
        CapturePaymentRequestSchema.safeParse({ order_id: "", paypal_order_id: "5X89234120938471K" })
          .success
      ).toBe(false);
    });

    it("strips client-injected amounts or capture overrides", () => {
      const tampered = {
        order_id: "ord_1001",
        paypal_order_id: "5X89234120938471K",
        amount_captured: 999999,
        reconciled: true,
      };
      const parsed = CapturePaymentRequestSchema.safeParse(tampered);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect((parsed.data as Record<string, unknown>).amount_captured).toBeUndefined();
        expect((parsed.data as Record<string, unknown>).reconciled).toBeUndefined();
        expect(Object.keys(parsed.data).sort()).toEqual(["order_id", "paypal_order_id"].sort());
      }
    });
  });

  describe("4. UpdateQuotationRequestSchema — Pricing Integrity", () => {
    it("rejects negative unit_price_minor in quotation", () => {
      const quote = {
        items: [
          {
            description: "Leather Wallets",
            quantity: 100,
            unit_price_minor: -3500,
          },
        ],
        shipping_minor: 15000,
      };
      expect(UpdateQuotationRequestSchema.safeParse(quote).success).toBe(false);
    });

    it("rejects negative shipping_minor in quotation", () => {
      const quote = {
        items: [
          {
            description: "Leather Wallets",
            quantity: 100,
            unit_price_minor: 3500,
          },
        ],
        shipping_minor: -100,
      };
      expect(UpdateQuotationRequestSchema.safeParse(quote).success).toBe(false);
    });

    it("applies safe defaults for omitted shipping, tax, and currency", () => {
      const quote = {
        items: [
          {
            description: "Leather Wallets",
            quantity: 100,
            unit_price_minor: 3500,
          },
        ],
      };
      const parsed = UpdateQuotationRequestSchema.safeParse(quote);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.shipping_minor).toBe(0);
        expect(parsed.data.tax_minor).toBe(0);
        expect(parsed.data.currency).toBe("USD");
      }
    });
  });

  describe("5. ParseOrderRequestSchema — Input Sanitation & Provider Control", () => {
    it("rejects empty inquiry or strings under 5 characters", () => {
      expect(ParseOrderRequestSchema.safeParse({ text: "" }).success).toBe(false);
      expect(ParseOrderRequestSchema.safeParse({ text: "a" }).success).toBe(false);
      expect(ParseOrderRequestSchema.safeParse({ text: "1234" }).success).toBe(false);
    });

    it("accepts valid text and assigns default provider 'auto'", () => {
      const parsed = ParseOrderRequestSchema.safeParse({
        text: "Please send 100 wallets to Dubai UAE.",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.provider).toBe("auto");
      }
    });

    it("rejects unsupported AI providers", () => {
      expect(
        ParseOrderRequestSchema.safeParse({
          text: "Please send 100 wallets to Dubai UAE.",
          provider: "unsupported-llm",
        }).success
      ).toBe(false);
    });
  });
});
