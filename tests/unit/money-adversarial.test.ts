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

describe("Adversarial Stress Testing — Monetary Math Engine", () => {
  describe("1. Floating-Point & Precision Edge Cases", () => {
    it("handles 0.1 + 0.2 IEEE 754 precision trap accurately", () => {
      // In JS, 0.1 + 0.2 === 0.30000000000000004
      const floatSum = 0.1 + 0.2;
      expect(floatSum).not.toBe(0.3); // Proves float imperfection exists in JS

      // decimalToMinor must round safely to 30 cents ($0.30)
      const minor = decimalToMinor(floatSum);
      expect(minor).toBe(30);
      expect(minorToDecimalString(minor)).toBe("0.30");
      expect(minorToDecimal(minor)).toBe(0.3);
    });

    it("handles 19.99 float multiplication without precision loss", () => {
      // In JS, 19.99 * 100 === 1998.9999999999998
      const rawProduct = 19.99 * 100;
      expect(rawProduct).not.toBe(1999); // Proves JS float multiplication drift

      // decimalToMinor numeric input handles float drift via Math.round
      expect(decimalToMinor(19.99)).toBe(1999);
      // decimalToMinor string input handles exact representation
      expect(decimalToMinor("19.99")).toBe(1999);
      expect(minorToDecimalString(1999)).toBe("19.99");
      expect(formatMoney(1999, "USD")).toBe("$19.99");
    });

    it("exposes IEEE 754 half-cent drift on float numbers vs string inputs (1.005 vs '1.005')", () => {
      // VULNERABILITY/PRECISION OBSERVATION:
      // In JS: 1.005 * 100 === 100.49999999999999
      // Therefore Math.round(1.005 * 100) rounds down to 100 cents ($1.00)
      const minorFromFloat = decimalToMinor(1.005);
      expect(minorFromFloat).toBe(100); // 1 cent lost due to float representation!

      // Conversely, string input parses digits before float conversion:
      const minorFromString = decimalToMinor("1.005");
      expect(minorFromString).toBe(101); // Correctly rounds up to $1.01

      // Documenting 100.005:
      expect(decimalToMinor("100.005")).toBe(10001);
      expect(decimalToMinor("100.004")).toBe(10000);
      expect(decimalToMinor("100.006")).toBe(10001);
    });

    it("handles 99-cent rounding roll-over to next whole unit", () => {
      // 100.995 rounds up to 101.00 (10100 cents)
      expect(decimalToMinor("100.995")).toBe(10100);
      expect(decimalToMinor("100.996")).toBe(10100);
      expect(decimalToMinor("100.994")).toBe(10099);

      // 0.995 rounds up to 1.00 (100 cents)
      expect(decimalToMinor("0.995")).toBe(100);
      expect(decimalToMinor("0.994")).toBe(99);

      // Negative roll-over: -100.995 -> -10100 cents
      expect(decimalToMinor("-100.995")).toBe(-10100);
    });

    it("evaluates zero, negative zero, and signed zero behavior", () => {
      expect(decimalToMinor(0)).toBe(0);
      expect(decimalToMinor("0")).toBe(0);
      expect(decimalToMinor("0.00")).toBe(0);
      expect(decimalToMinor("$0.00")).toBe(0);

      // Signed zero observation:
      // decimalToMinor("-0") produces -0 because isNegative is true and result is 0
      const negativeZeroFromStr = decimalToMinor("-0");
      expect(negativeZeroFromStr === 0).toBe(true); // Loose equality holds
      expect(Object.is(negativeZeroFromStr, -0)).toBe(true); // Demonstrates signed zero -0

      const negativeZeroFromStr2 = decimalToMinor("-0.00");
      expect(negativeZeroFromStr2 === 0).toBe(true);
      expect(Object.is(negativeZeroFromStr2, -0)).toBe(true);

      // Format behavior with signed zero
      expect(minorToDecimalString(0)).toBe("0.00");
      expect(minorToDecimalString(-0)).toBe("0.00");
      // Note: formatMoney with -0 produces "-$0.00" in Intl.NumberFormat:
      expect(formatMoney(0, "USD")).toBe("$0.00");
      expect(formatMoney(-0, "USD")).toBe("-$0.00");
    });

    it("handles negative amounts accurately", () => {
      expect(decimalToMinor("-0.01")).toBe(-1);
      expect(decimalToMinor(-0.01)).toBe(-1);
      expect(decimalToMinor("-19.99")).toBe(-1999);
      expect(decimalToMinor(-19.99)).toBe(-1999);
      expect(decimalToMinor("-$1,250.50")).toBe(-125050);

      expect(minorToDecimalString(-1)).toBe("-0.01");
      expect(minorToDecimalString(-9)).toBe("-0.09");
      expect(minorToDecimalString(-10)).toBe("-0.10");
      expect(minorToDecimalString(-100)).toBe("-1.00");
      expect(minorToDecimalString(-1999)).toBe("-19.99");
      expect(minorToDecimalString(-125050)).toBe("-1250.50");

      expect(minorToDecimal(-1999)).toBe(-19.99);
      expect(formatMoney(-1999, "USD")).toBe("-$19.99");
    });

    it("handles diverse formatted currency string variations", () => {
      expect(decimalToMinor("   $ 35.00  ")).toBe(3500);
      expect(decimalToMinor("€ 1,234.56")).toBe(123456);
      expect(decimalToMinor("AED 3,650.00")).toBe(365000);
      expect(decimalToMinor(".50")).toBe(50);
      expect(decimalToMinor(".05")).toBe(5);
      expect(decimalToMinor("-.75")).toBe(-75);
      expect(decimalToMinor("500")).toBe(50000);
      expect(decimalToMinor("500.")).toBe(50000);
    });

    it("observes behavior of scientific notation strings (e.g. '1e2')", () => {
      // In decimalToMinor: regex /[^0-9.-]/g removes "e", leaving "12"
      // "1e2" (which mathematically equals 100) becomes 12 ($0.12)
      expect(decimalToMinor("1e2")).toBe(1200); // 12 -> 1200 cents ($12.00)
    });

    it("rejects non-numeric and malformed string formats", () => {
      expect(() => decimalToMinor("")).toThrow();
      expect(() => decimalToMinor("   ")).toThrow();
      expect(() => decimalToMinor("-")).toThrow();
      expect(() => decimalToMinor("abc")).toThrow();
      expect(() => decimalToMinor("$ -")).toThrow();
      expect(() => decimalToMinor("12.34.56")).toThrow();
      expect(() => decimalToMinor("--50")).toThrow();
      expect(() => decimalToMinor(null as unknown as string)).toThrow(TypeError);
      expect(() => decimalToMinor(undefined as unknown as string)).toThrow(TypeError);
      expect(() => decimalToMinor({} as unknown as string)).toThrow(TypeError);
    });
  });

  describe("2. Large Integer & Capacity Stress Testing", () => {
    it("handles hundreds of thousands of dollars without overflow", () => {
      // $500,000.00 = 50,000,000 cents
      const fiveHundredKMinor = 50000000;
      expect(minorToDecimalString(fiveHundredKMinor)).toBe("500000.00");
      expect(minorToDecimal(fiveHundredKMinor)).toBe(500000);
      expect(formatMoney(fiveHundredKMinor, "USD")).toBe("$500,000.00");
      expect(decimalToMinor("$500,000.00")).toBe(fiveHundredKMinor);
      expect(decimalToMinor("500000.00")).toBe(fiveHundredKMinor);

      // $10,000,000.00 = 1,000,000,000 cents (1 billion minor units)
      const tenMillionMinor = 1000000000;
      expect(minorToDecimalString(tenMillionMinor)).toBe("10000000.00");
      expect(formatMoney(tenMillionMinor, "USD")).toBe("$10,000,000.00");
      expect(decimalToMinor("$10,000,000.00")).toBe(tenMillionMinor);
    });

    it("operates reliably up to JavaScript MAX_SAFE_INTEGER bounds", () => {
      // Number.MAX_SAFE_INTEGER is 9,007,199,254,740,991 (~$90.07 trillion)
      const largeSafeMinor = 9007199254740991;
      const decString = minorToDecimalString(largeSafeMinor);
      expect(decString).toBe("90071992547409.91");

      // Verify non-finite numbers trigger validation errors
      expect(() => minorToDecimal(NaN)).toThrow(TypeError);
      expect(() => minorToDecimal(Infinity)).toThrow(TypeError);
      expect(() => minorToDecimalString(NaN)).toThrow(TypeError);
      expect(() => minorToDecimalString(Infinity)).toThrow(TypeError);
      expect(() => decimalToMinor(NaN)).toThrow(TypeError);
      expect(() => decimalToMinor(Infinity)).toThrow(TypeError);
    });
  });

  describe("3. Order Total Calculations Stress Testing", () => {
    it("handles 0 items (empty order) with zero shipping and zero tax", () => {
      const result = calculateOrderTotals([], 0, 0);
      expect(result.subtotal_minor).toBe(0);
      expect(result.shipping_minor).toBe(0);
      expect(result.tax_minor).toBe(0);
      expect(result.total_minor).toBe(0);
    });

    it("handles 0 items with non-zero shipping fee", () => {
      const result = calculateOrderTotals([], 2500, 500); // $25 shipping, 5% tax
      expect(result.subtotal_minor).toBe(0);
      expect(result.shipping_minor).toBe(2500);
      // Tax applies to subtotal: 5% of 0 is 0
      expect(result.tax_minor).toBe(0);
      expect(result.total_minor).toBe(2500); // Total is strictly shipping
    });

    it("handles single item with zero shipping and zero tax", () => {
      const items = [{ quantity: 1, unit_price_minor: 3500 }]; // 1 @ $35.00
      const result = calculateOrderTotals(items, 0, 0);
      expect(result.subtotal_minor).toBe(3500);
      expect(result.shipping_minor).toBe(0);
      expect(result.tax_minor).toBe(0);
      expect(result.total_minor).toBe(3500);
    });

    it("handles multiple items (e.g. 5 distinct product lines)", () => {
      const items = [
        { quantity: 100, unit_price_minor: 3500 }, // $3,500.00
        { quantity: 50, unit_price_minor: 1250 },  // $625.00
        { quantity: 10, unit_price_minor: 9999 },  // $999.90
        { quantity: 1, unit_price_minor: 150000 }, // $1,500.00
        { quantity: 200, unit_price_minor: 45 },   // $90.00
      ];
      // Expected subtotal: 350000 + 62500 + 99990 + 150000 + 9000 = 671490 ($6,714.90)
      const shipping = 25000; // $250.00
      const taxBps = 750; // 7.50% tax -> 671490 * 750 / 10000 = 50361.75 -> rounds to 50362 ($503.62)

      const result = calculateOrderTotals(items, shipping, taxBps);
      expect(result.subtotal_minor).toBe(671490);
      expect(result.shipping_minor).toBe(25000);
      expect(result.tax_minor).toBe(50362);
      expect(result.total_minor).toBe(671490 + 25000 + 50362); // 746852 ($7,468.52)
    });

    it("tests tax basis points rounding across boundary subtotal amounts", () => {
      // Test half-cent rounding in tax:
      // Subtotal = $10.01 (1001 cents), Tax rate = 500 bps (5.00%)
      // 1001 * 500 / 10000 = 50.05 cents -> Math.round -> 50 cents ($0.50)
      const res1 = calculateOrderTotals([{ quantity: 1, unit_price_minor: 1001 }], 0, 500);
      expect(res1.tax_minor).toBe(50);

      // Subtotal = $10.10 (1010 cents), Tax rate = 500 bps (5.00%)
      // 1010 * 500 / 10000 = 50.50 cents -> Math.round -> 51 cents ($0.51)
      const res2 = calculateOrderTotals([{ quantity: 1, unit_price_minor: 1010 }], 0, 500);
      expect(res2.tax_minor).toBe(51);

      // Subtotal = $100.00 (10000 cents), 1 bp (0.01%):
      // 10000 * 1 / 10000 = 1 cent
      const res3 = calculateOrderTotals([{ quantity: 1, unit_price_minor: 10000 }], 0, 1);
      expect(res3.tax_minor).toBe(1);

      // 100% tax (10000 bps):
      const res4 = calculateOrderTotals([{ quantity: 1, unit_price_minor: 10000 }], 0, 10000);
      expect(res4.tax_minor).toBe(10000);
      expect(res4.total_minor).toBe(20000);
    });

    it("defends against negative quantities, prices, shipping, and tax rates", () => {
      // Malicious or corrupted inputs: negative values must be clamped to 0
      const items = [
        { quantity: -5, unit_price_minor: 3500 }, // Clamped to 0
        { quantity: 10, unit_price_minor: -1000 }, // Clamped to 0
        { quantity: 2, unit_price_minor: 5000 },  // 10000
      ];
      const negativeShipping = -5000; // Clamped to 0
      const negativeTaxBps = -500;   // Clamped to 0

      const result = calculateOrderTotals(items, negativeShipping, negativeTaxBps);
      expect(result.subtotal_minor).toBe(10000);
      expect(result.shipping_minor).toBe(0);
      expect(result.tax_minor).toBe(0);
      expect(result.total_minor).toBe(10000);
    });

    it("observes NaN propagation when non-finite inputs are passed to calculateOrderTotals", () => {
      // When non-finite values are passed, Math.round(NaN) produces NaN
      const resWithNaNQty = calculateOrderTotals([{ quantity: NaN, unit_price_minor: 3500 }], 0, 0);
      expect(Number.isNaN(resWithNaNQty.subtotal_minor)).toBe(true);

      const resWithNaNShipping = calculateOrderTotals([{ quantity: 1, unit_price_minor: 3500 }], NaN, 0);
      expect(Number.isNaN(resWithNaNShipping.shipping_minor)).toBe(true);

      const resWithNaNTax = calculateOrderTotals([{ quantity: 1, unit_price_minor: 3500 }], 0, NaN);
      expect(Number.isNaN(resWithNaNTax.tax_minor)).toBe(true);
    });

    it("calculates large export wholesale order totals flawlessly", () => {
      // 5,000 units @ $120.00 = $600,000.00 (60,000,000 cents)
      // Shipping: $4,500.00 (450,000 cents)
      // Tax: 500 bps (5.00%) = $30,000.00 (3,000,000 cents)
      // Grand Total: $634,500.00 (63,450,000 cents)
      const items = [{ quantity: 5000, unit_price_minor: 12000 }];
      const result = calculateOrderTotals(items, 450000, 500);

      expect(result.subtotal_minor).toBe(60000000);
      expect(result.shipping_minor).toBe(450000);
      expect(result.tax_minor).toBe(3000000);
      expect(result.total_minor).toBe(63450000);

      expect(minorToDecimalString(result.total_minor)).toBe("634500.00");
      expect(formatMoney(result.total_minor, "USD")).toBe("$634,500.00");
    });
  });

  describe("4. compareMoney Edge Cases", () => {
    it("handles exact equality, differences, and rounded comparisons", () => {
      expect(compareMoney(0, 0)).toBe(0);
      expect(compareMoney(365000, 365000)).toBe(0);
      expect(compareMoney(-100, -100)).toBe(0);
      expect(compareMoney(365001, 365000)).toBe(1);
      expect(compareMoney(365000, 365001)).toBe(-1);
    });
  });
});
