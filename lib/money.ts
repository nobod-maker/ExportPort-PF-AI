/**
 * ExportPilot PayFlow AI — Monetary Arithmetic and Currency Utilities
 *
 * Strict Integer Minor Unit (Cents/Fils) Math:
 * Eliminates IEEE 754 floating-point drift across order totals, PayPal transactions,
 * and currency formatting.
 */

export interface OrderItemPrice {
  quantity: number;
  unit_price_minor: number;
}

export interface OrderTotalsCalculation {
  subtotal_minor: number;
  shipping_minor: number;
  tax_minor: number;
  total_minor: number;
}

/**
 * Converts minor currency units (e.g., cents, fils) to floating-point decimal.
 * Example: 250000 -> 2500.00, 3500 -> 35.0
 */
export function minorToDecimal(cents: number): number {
  if (!Number.isFinite(cents)) {
    throw new TypeError(`minorToDecimal requires a finite number, received: ${cents}`);
  }
  return cents / 100;
}

/**
 * Converts minor currency units to a fixed 2-decimal string representation
 * without floating-point drift.
 * Example: 250000 -> "2500.00", 3500 -> "35.00", 7 -> "0.07"
 */
export function minorToDecimalString(cents: number): string {
  if (!Number.isFinite(cents)) {
    throw new TypeError(`minorToDecimalString requires a finite number, received: ${cents}`);
  }

  const rounded = Math.round(cents);
  const isNegative = rounded < 0;
  const abs = Math.abs(rounded);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const fractionStr = fraction < 10 ? `0${fraction}` : `${fraction}`;

  return `${isNegative ? "-" : ""}${whole}.${fractionStr}`;
}

/**
 * Converts a decimal representation (number or string) to integer minor units (cents).
 * Safely parses formatted strings (e.g. "$1,250.50", "35.00", "0.07") avoiding float rounding errors.
 * Example: "35.00" -> 3500, 35 -> 3500, "1250.50" -> 125050
 */
export function decimalToMinor(decimal: number | string): number {
  if (typeof decimal === "number") {
    if (!Number.isFinite(decimal)) {
      throw new TypeError(`decimalToMinor requires a finite number, received: ${decimal}`);
    }
    return Math.round(decimal * 100);
  }

  if (typeof decimal !== "string") {
    throw new TypeError(`decimalToMinor requires a number or string, received: ${typeof decimal}`);
  }

  // Clean currency symbols, commas, and whitespace
  const sanitized = decimal.replace(/[^0-9.-]/g, "").trim();
  if (sanitized === "" || sanitized === "-" || isNaN(Number(sanitized))) {
    throw new Error(`Invalid decimal currency string: "${decimal}"`);
  }

  const isNegative = sanitized.startsWith("-");
  const absStr = isNegative ? sanitized.slice(1) : sanitized;
  const [wholeStr, fracStr = ""] = absStr.split(".");

  const whole = parseInt(wholeStr || "0", 10);
  // Take first 2 digits of fraction, pad with 0 if necessary
  const twoDigitFracStr = (fracStr + "00").slice(0, 2);
  const thirdDigit = fracStr.length >= 3 ? parseInt(fracStr[2], 10) : 0;
  let fraction = parseInt(twoDigitFracStr, 10);

  // Round if 3rd decimal place is >= 5
  if (thirdDigit >= 5) {
    fraction += 1;
  }

  const result = whole * 100 + fraction;
  return isNegative ? -result : result;
}

/**
 * Formats minor currency units for UI display with the appropriate currency symbol and locale.
 * Example: (365000, "USD") -> "$3,650.00", (365000, "AED") -> "AED 3,650.00"
 */
export function formatMoney(cents: number, currency: string = "USD"): string {
  if (!Number.isFinite(cents)) {
    return "$0.00";
  }

  const decimal = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(decimal);
  } catch {
    // Fallback if currency code is not supported by Intl
    const sign = cents < 0 ? "-" : "";
    return `${sign}${currency.toUpperCase()} ${Math.abs(decimal).toFixed(2)}`;
  }
}

/**
 * Calculates a single order item's line total in integer minor units.
 * Guarantees integer output.
 */
export function calculateLineTotal(quantity: number, unitPriceMinor: number): number {
  const safeQty = Math.max(0, Math.round(quantity));
  const safePrice = Math.max(0, Math.round(unitPriceMinor));
  return safeQty * safePrice;
}

/**
 * Recomputes order subtotal, shipping, tax, and grand total in integer minor units.
 *
 * @param items Array of order items with quantity and unit price in minor units
 * @param shipping_minor Shipping fee in minor units (defaults to 0)
 * @param tax_rate_basis_points Tax rate in basis points (1 bp = 0.01%, 500 bps = 5.00%)
 */
export function calculateOrderTotals(
  items: OrderItemPrice[],
  shipping_minor: number = 0,
  tax_rate_basis_points: number = 0
): OrderTotalsCalculation {
  const subtotal_minor = items.reduce((acc, item) => {
    const lineTotal = calculateLineTotal(item.quantity, item.unit_price_minor);
    return acc + lineTotal;
  }, 0);

  const safeShipping = Math.max(0, Math.round(shipping_minor));

  // Compute tax in integer minor units (basis points / 10000)
  const safeBps = Math.max(0, Math.round(tax_rate_basis_points));
  const tax_minor = Math.round((subtotal_minor * safeBps) / 10000);

  const total_minor = subtotal_minor + safeShipping + tax_minor;

  return {
    subtotal_minor,
    shipping_minor: safeShipping,
    tax_minor,
    total_minor,
  };
}

/**
 * Validates whether two minor monetary amounts match exactly.
 */
export function compareMoney(aMinor: number, bMinor: number): number {
  return Math.round(aMinor) - Math.round(bMinor);
}
