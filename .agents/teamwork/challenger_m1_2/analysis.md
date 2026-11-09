# Adversarial Challenge Analysis — Milestone 1: Zod Validation & Build Integrity

**Agent**: `challenger_m1_2` (Empirical Challenger)  
**Date**: 2026-11-09  
**Target Scope**: `lib/validation/order.ts`, Project Build Integrity, Vitest Test Suites  
**Verdict**: **APPROVE** (with Non-Blocking Hardening Recommendations)

---

## 1. Executive Summary

As the Empirical Challenger for Milestone 1 (Foundation & Shared Contracts), this investigation subjected `lib/validation/order.ts`, the Next.js 14 production build pipeline, and the test infrastructure to white-box adversarial stress testing.

An empirical test suite comprising 28 automated stress tests (`tests/unit/validation-adversarial.test.ts`) was authored and executed. All 28 adversarial tests plus the 9 baseline validation unit tests executed cleanly. Furthermore, the Next.js production build (`npm run build`) was directly executed and verified to compile with zero TypeScript errors and zero linter warnings.

The Zod schemas demonstrate strong architectural discipline:
- Enforcing non-negotiable hackathon invariants: negative quantities, floats in integer fields, and missing arrays are strictly rejected.
- Missing prices in extraction are preserved as `null` (not fabricated).
- Extra client fields in order creation and capture are safely stripped by Zod's default behavior.
- Several minor boundary optimizations (e.g. trimming whitespace on IDs, regex on ISO currency/country codes, max length bounds) are detailed below for subsequent implementation in Milestones 2 and 3.

---

## 2. Empirical Stress Test Findings

### Challenge 1: Malformed Inputs against `AIExtractionResultSchema`

| Stress Scenario | Input Payload | Expected Behavior | Observed Behavior | Status |
|-----------------|---------------|-------------------|-------------------|:------:|
| **Missing Array (`items`)** | `delete data.items` | Schema rejection | Rejected with `"Required"` | **PASS** |
| **Null Array (`items`)** | `items: null` | Schema rejection | Rejected with `"Expected array, received null"` | **PASS** |
| **Empty Array (`items`)** | `items: []` | Schema rejection | Rejected with `"At least one item must be extracted"` | **PASS** |
| **Missing `missing_fields`** | `delete data.missing_fields` | Schema rejection | Rejected with `"Required"` | **PASS** |
| **Missing `evidence_snippets`** | `delete data.evidence_snippets` | Schema rejection | Rejected with `"Required"` | **PASS** |
| **String Number (`quantity`)** | `quantity: "100"` | Schema rejection | Rejected with `"Expected number, received string"` | **PASS** |
| **String Number (`unit_price_minor`)** | `unit_price_minor: "3500"` | Schema rejection | Rejected with `"Expected number, received string"` | **PASS** |
| **String Number (`shipping_minor`)** | `shipping_minor: "15000"` | Schema rejection | Rejected with `"Expected number, received string"` | **PASS** |
| **String Float (`confidence_score`)** | `confidence_score: "0.95"` | Schema rejection | Rejected with `"Expected number, received string"` | **PASS** |
| **Negative Quantity** | `quantity: -10` | Schema rejection | Rejected with `"Quantity must be a positive integer"` | **PASS** |
| **Zero Quantity** | `quantity: 0` | Schema rejection | Rejected with `"Quantity must be a positive integer"` | **PASS** |
| **Float Quantity** | `quantity: 12.5` | Schema rejection | Rejected with `"Expected integer, received float"` | **PASS** |
| **Non-finite Quantity** | `quantity: NaN` | Schema rejection | Rejected with `"Expected integer, received nan"` | **PASS** |
| **Negative Shipping** | `shipping_minor: -100` | Schema rejection | Rejected with `"Number must be greater than or equal to 0"` | **PASS** |
| **Negative Tax** | `tax_minor: -50` | Schema rejection | Rejected with `"Number must be greater than or equal to 0"` | **PASS** |
| **Negative Unit Price** | `unit_price_minor: -1` | Schema rejection | Rejected with `"Unit price must be non-negative"` | **PASS** |
| **Out-of-bounds Confidence** | `confidence_score: -0.01` or `1.01` | Schema rejection | Rejected with min 0 / max 1 boundary | **PASS** |
| **Empty Item Description** | `description: ""` | Schema rejection | Rejected with `"Item description is required"` | **PASS** |
| **Missing Price Invariant** | `unit_price_minor: null` | Preserved as null | Validated successfully with null preserved | **PASS** |
| **Invalid Currency Length** | `currency: "US"` or `"USDD"` | Schema rejection | Rejected with `"Currency code must be 3-character ISO 4217"` | **PASS** |
| **Invalid Country Length** | `destination_country: "UAE"` or `"U"` | Schema rejection | Rejected with `"Country code must be 2-character ISO alpha-2"` | **PASS** |
| **SQL Injection in `buyer_name`** | `'; DROP TABLE buyers; --` | Parsed safely as string | Validated without error; parameterized downstream | **PASS** |
| **XSS Injection in `buyer_name`** | `<script>alert(1)</script>` | Parsed safely as string | Validated safely without execution | **PASS** |

#### Minor Boundary Observations:
1. **Currency Character Regex**:
   - `currency: z.string().length(3).nullable()` verifies `length === 3`, but permits lowercase `"usd"` or numeric `"123"`.
   - While valid for length, PayPal's Orders v2 API mandates ISO 4217 uppercase 3-letter codes (e.g. `"USD"`, `"EUR"`, `"AED"`).
   - *Recommendation*: Enhance with regex: `z.string().regex(/^[A-Z]{3}$/, "Must be 3 uppercase letters").nullable()`.
2. **Country Code Character Regex**:
   - `destination_country: z.string().length(2).nullable()` allows `"12"` or `"ae"`.
   - *Recommendation*: Enhance with `z.string().regex(/^[A-Z]{2}$/, "Must be 2 uppercase letters").nullable()`.
3. **Uncapped String Lengths**:
   - `buyer_name`, `buyer_company`, `notes`, and `description` have no `.max(...)` upper bound. A malicious input or hallucinating LLM could output 10MB strings, leading to memory inflation.
   - *Recommendation*: Add `.max(255)` for names/companies and `.max(5000)` for notes.

---

### Challenge 2: Tampering & Edge Cases in `CreateOrderRequestSchema` & `CapturePaymentRequestSchema`

| Stress Scenario | Input Payload | Expected Behavior | Observed Behavior | Status |
|-----------------|---------------|-------------------|-------------------|:------:|
| **Missing `order_id` in Create** | `{}` | Schema rejection | Rejected with `"Required"` | **PASS** |
| **Empty `order_id` in Create** | `{ order_id: "" }` | Schema rejection | Rejected with `"Order ID is required"` | **PASS** |
| **Null or Number `order_id`** | `{ order_id: null }` / `12345` | Schema rejection | Rejected with type mismatch | **PASS** |
| **Client Price Tampering** | `{ order_id: "ord_1", total_minor: 1 }` | Stripped by schema | `total_minor` stripped; only `order_id` returned | **PASS** |
| **Client Status Tampering** | `{ order_id: "ord_1", status: "paid" }` | Stripped by schema | `status` stripped; only `order_id` returned | **PASS** |
| **Prototype Pollution Injection** | `{"order_id": "ord_1", "__proto__": {...}}` | No prototype leak | Stripped; Object prototype unpolluted | **PASS** |
| **Missing `paypal_order_id` in Capture**| `{ order_id: "ord_1" }` | Schema rejection | Rejected with `"PayPal order ID is required"` | **PASS** |
| **Missing `order_id` in Capture** | `{ paypal_order_id: "5X..." }` | Schema rejection | Rejected with `"Order ID is required"` | **PASS** |
| **Whitespace-only `order_id`** | `{ order_id: "   " }` | Should reject blank ID | Accepted because `"   ".length === 3 >= 1` | **FINDING** |

#### Vulnerability & Remediation Note on Whitespace IDs:
- **Observation**: `CreateOrderRequestSchema` defines `order_id: z.string().min(1)`. A payload containing `{ order_id: "   " }` passes validation because spaces satisfy `min(1)`.
- **Blast Radius**: Low in M1 because database lookups will simply fail with 404/not found. However, input validation should fail fast.
- **Remediation**:
  ```ts
  export const CreateOrderRequestSchema = z.object({
    order_id: z.string().trim().min(1, "Order ID is required"),
  });
  
  export const CapturePaymentRequestSchema = z.object({
    order_id: z.string().trim().min(1, "Order ID is required"),
    paypal_order_id: z.string().trim().min(1, "PayPal order ID is required"),
  });
  ```

---

### Challenge 3: Build Integrity & Test Verification

1. **Next.js Production Build (`npm run build`)**:
   - Command: `next build`
   - Output:
     ```
     ▲ Next.js 14.2.24
     Creating an optimized production build ...
     ✓ Compiled successfully
     Linting and checking validity of types ...
     Collecting page data ...
     Generating static pages (4/4) ...
     ✓ Generating static pages (4/4)
     Finalizing page optimization ...
     Collecting build traces ...
     Route (app)                              Size     First Load JS
     ┌ ○ /                                    6.98 kB        94.1 kB
     └ ○ /_not-found                          873 B            88 kB
     ```
   - Exit Code: `0`.
   - Typecheck: Full TypeScript strict typechecking passed with no errors.
   - Linting: ESLint passed with no warnings.

2. **Validation Test Suite (`vitest run`)**:
   - Baseline suite (`tests/unit/validation.test.ts`): 9 tests passed.
   - Adversarial suite (`tests/unit/validation-adversarial.test.ts`): 28 tests passed.
   - Combined validation test execution: **37 tests passed (0 failed)** in 128ms.

---

## 3. Adversarial Hardening Recommendations for Downstream Milestones

1. **Trim String IDs**:
   Apply `.trim().min(1)` to `order_id` and `paypal_order_id` to prevent blank space strings from entering the database pipeline.
2. **ISO Format Enforcement**:
   Upgrade `currency` to `.regex(/^[A-Z]{3}$/)` and `destination_country` to `.regex(/^[A-Z]{2}$/)` so lowercase or alphanumeric corruptions are caught at the API edge.
3. **Upper-bound String Constraints**:
   Add `.max(255)` on buyer names/emails/companies and `.max(5000)` on inquiry text and notes to protect against buffer stuffing.
4. **AI Output Pre-Processing**:
   When invoking LLMs in Milestone 2 (`/api/ai/parse-order`), LLMs occasionally format integers as strings (e.g. `"quantity": "100"`). The schema's strict rejection is correct, but the LLM provider wrapper should use structured JSON mode (`response_format: { type: "json_object" }` or Gemini schema definition) to ensure JSON numbers are generated as native numeric types.

---

## 4. Final Verdict

**VERDICT**: **APPROVE**

The validation layer in `lib/validation/order.ts` is robust, mathematically consistent with the minor-unit currency model, resilient against injection attacks, and enforces all core business rules and hackathon constraints. The Next.js 14 build and validation test suites pass cleanly. Downstream work on Milestone 2 (AI & DB) and Milestone 3 (PayPal) may proceed without blockers.
