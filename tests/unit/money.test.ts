import { describe, it, expect } from "vitest";
import {
  minorToDecimal,
  minorToDecimalString,
  decimalToMinor,
  formatMoney,
  calculateLineTotal,
  calculateOrderTotals,
  compareMoney,
} from "@/lib/money";

describe("Monetary Arithmetic & Currency Utilities", () => {
  describe("minorToDecimal", () => {
    it("converts minor units (cents) to floating decimal correctly", () => {
      expect(minorToDecimal(250000)).toBe(2500);
      expect(minorToDecimal(3500)).toBe(35);
      expect(minorToDecimal(7)).toBe(0.07);
      expect(minorToDecimal(0)).toBe(0);
    });

    it("throws a TypeError on non-finite input", () => {
      expect(() => minorToDecimal(NaN)).toThrow(TypeError);
      expect(() => minorToDecimal(Infinity)).toThrow(TypeError);
    });
  });

  describe("minorToDecimalString", () => {
    it("formats minor units to fixed 2-decimal string without floating drift", () => {
      expect(minorToDecimalString(250000)).toBe("2500.00");
      expect(minorToDecimalString(3500)).toBe("35.00");
      expect(minorToDecimalString(7)).toBe("0.07");
      expect(minorToDecimalString(0)).toBe("0.00");
      expect(minorToDecimalString(365000)).toBe("3650.00");
    });

    it("handles negative amounts cleanly", () => {
      expect(minorToDecimalString(-1500)).toBe("-15.00");
      expect(minorToDecimalString(-50)).toBe("-0.50");
    });

    it("throws a TypeError on non-finite input", () => {
      expect(() => minorToDecimalString(NaN)).toThrow(TypeError);
    });
  });

  describe("decimalToMinor", () => {
    it("converts numeric decimals to integer minor units", () => {
      expect(decimalToMinor(35)).toBe(3500);
      expect(decimalToMinor(35.0)).toBe(3500);
      expect(decimalToMinor(0.07)).toBe(7);
      expect(decimalToMinor(2500.5)).toBe(250050);
      expect(decimalToMinor(0)).toBe(0);
    });

    it("converts formatted string decimals to integer minor units", () => {
      expect(decimalToMinor("35.00")).toBe(3500);
      expect(decimalToMinor("$35.00")).toBe(3500);
      expect(decimalToMinor("3,650.00")).toBe(365000);
      expect(decimalToMinor("$1,250.50")).toBe(125050);
      expect(decimalToMinor("0.07")).toBe(7);
      expect(decimalToMinor("0")).toBe(0);
    });

    it("handles 3-decimal rounding accurately", () => {
      expect(decimalToMinor("35.004")).toBe(3500);
      expect(decimalToMinor("35.005")).toBe(3501);
      expect(decimalToMinor("35.009")).toBe(3501);
    });

    it("throws Error on invalid currency string", () => {
      expect(() => decimalToMinor("invalid")).toThrow();
      expect(() => decimalToMinor("")).toThrow();
    });
  });

  describe("formatMoney", () => {
    it("formats minor units into currency string with symbol", () => {
      const formattedUSD = formatMoney(365000, "USD");
      expect(formattedUSD).toContain("3,650.00");
      expect(formattedUSD).toContain("$");

      const formattedZero = formatMoney(0, "USD");
      expect(formattedZero).toContain("0.00");
    });

    it("handles alternative currency codes safely", () => {
      const formattedEUR = formatMoney(10000, "EUR");
      expect(formattedEUR).toContain("100.00");
    });
  });

  describe("calculateLineTotal", () => {
    it("multiplies quantity and unit price in integer minor units", () => {
      expect(calculateLineTotal(100, 3500)).toBe(350000);
      expect(calculateLineTotal(0, 3500)).toBe(0);
      expect(calculateLineTotal(5, 1250)).toBe(6250);
    });
  });

  describe("calculateOrderTotals", () => {
    it("computes exact totals for the Authoritative UAE 100-wallet inquiry", () => {
      const items = [{ quantity: 100, unit_price_minor: 3500 }]; // 100 @ $35.00
      const shipping = 15000; // $150.00
      const taxBps = 0; // 0%

      const result = calculateOrderTotals(items, shipping, taxBps);

      expect(result.subtotal_minor).toBe(350000); // $3,500.00
      expect(result.shipping_minor).toBe(15000); // $150.00
      expect(result.tax_minor).toBe(0);
      expect(result.total_minor).toBe(365000); // $3,650.00
    });

    it("computes tax accurately with basis points (500 bps = 5.00%)", () => {
      const items = [
        { quantity: 2, unit_price_minor: 5000 }, // $100.00
      ];
      const shipping = 1000; // $10.00
      const taxBps = 500; // 5.00% of $100 = $5.00 (500 cents)

      const result = calculateOrderTotals(items, shipping, taxBps);

      expect(result.subtotal_minor).toBe(10000);
      expect(result.shipping_minor).toBe(1000);
      expect(result.tax_minor).toBe(500);
      expect(result.total_minor).toBe(11500); // $115.00
    });
  });

  describe("compareMoney", () => {
    it("correctly identifies exact matches and differences", () => {
      expect(compareMoney(365000, 365000)).toBe(0);
      expect(compareMoney(365000, 350000)).toBeGreaterThan(0);
      expect(compareMoney(350000, 365000)).toBeLessThan(0);
    });
  });
});
