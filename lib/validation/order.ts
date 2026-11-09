import { z } from "zod";

/**
 * ExportPilot PayFlow AI — Zod Schemas for Validation and Runtime Type Safety
 */

export const IncotermEnum = z.enum([
  "EXW",
  "FCA",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
]);

export const OrderStatusEnum = z.enum([
  "draft",
  "analyzed",
  "quoted",
  "awaiting_payment",
  "paid",
  "cancelled",
  "refunded",
  "needs_review",
]);

export const PaymentStatusEnum = z.enum([
  "CREATED",
  "SAVED",
  "APPROVED",
  "VOIDED",
  "COMPLETED",
  "PAYER_ACTION_REQUIRED",
  "PENDING",
  "FAILED",
  "REFUNDED",
]);

export const AIExtractedItemSchema = z.object({
  description: z.string().min(1, "Item description is required"),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unit_price_minor: z.number().int().nonnegative("Unit price must be non-negative").nullable(),
  line_total_minor: z.number().int().nonnegative("Line total must be non-negative").nullable(),
  confidence: z.number().min(0).max(1).optional(),
});

export const AIEvidenceSnippetSchema = z.object({
  field: z.string().min(1),
  snippet: z.string().min(1),
});

export const AIExtractionResultSchema = z.object({
  buyer_name: z.string().nullable(),
  buyer_email: z.string().email("Invalid buyer email format").nullable().or(z.literal(null)),
  buyer_company: z.string().nullable(),
  destination_country: z.string().length(2, "Country code must be 2-character ISO alpha-2").nullable(),
  currency: z.string().length(3, "Currency code must be 3-character ISO 4217").nullable(),
  items: z.array(AIExtractedItemSchema).min(1, "At least one item must be extracted"),
  shipping_minor: z.number().int().nonnegative().nullable(),
  tax_minor: z.number().int().nonnegative().nullable(),
  incoterm: IncotermEnum.nullable().optional(),
  requested_delivery_date: z.string().nullable(),
  notes: z.string().nullable(),
  missing_fields: z.array(z.string()),
  evidence_snippets: z.array(AIEvidenceSnippetSchema),
  confidence_score: z.number().min(0).max(1),
  is_fallback: z.boolean(),
  provider_used: z.string().optional(),
});

export const ParseOrderRequestSchema = z.object({
  text: z.string().min(5, "Inquiry text must be at least 5 characters"),
  provider: z.enum(["gemini", "openrouter", "fallback", "auto"]).optional().default("auto"),
});

export const QuotationItemInputSchema = z.object({
  description: z.string().min(1, "Description is required"),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unit_price_minor: z.number().int().nonnegative("Unit price cannot be negative"),
});

export const UpdateQuotationRequestSchema = z.object({
  items: z.array(QuotationItemInputSchema).min(1, "At least one item is required"),
  shipping_minor: z.number().int().nonnegative("Shipping cannot be negative").default(0),
  tax_minor: z.number().int().nonnegative("Tax cannot be negative").default(0),
  incoterm: IncotermEnum.nullable().optional(),
  seller_notes: z.string().nullable().optional(),
  destination_country: z.string().length(2).optional(),
  currency: z.string().length(3).default("USD"),
});

export const CreateOrderRequestSchema = z.object({
  order_id: z.string().min(1, "Order ID is required"),
});

export const CapturePaymentRequestSchema = z.object({
  order_id: z.string().min(1, "Order ID is required"),
  paypal_order_id: z.string().min(1, "PayPal order ID is required"),
});

// Inferred TypeScript Types
export type AIExtractedItemValidated = z.infer<typeof AIExtractedItemSchema>;
export type AIExtractionResultValidated = z.infer<typeof AIExtractionResultSchema>;
export type ParseOrderRequestValidated = z.infer<typeof ParseOrderRequestSchema>;
export type UpdateQuotationRequestValidated = z.infer<typeof UpdateQuotationRequestSchema>;
export type CreateOrderRequestValidated = z.infer<typeof CreateOrderRequestSchema>;
export type CapturePaymentRequestValidated = z.infer<typeof CapturePaymentRequestSchema>;
