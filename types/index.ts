/**
 * ExportPilot PayFlow AI — Shared Domain Types and API Contracts
 * Single source of truth across Frontend, PayPal, AI/DB, and QA test modules.
 */

// =============================================================================
// 1. Primitive Enums and Literals
// =============================================================================

export type OrderStatus =
  | 'draft'
  | 'analyzed'
  | 'quoted'
  | 'awaiting_payment'
  | 'paid'
  | 'cancelled'
  | 'refunded'
  | 'needs_review';

export type PaymentStatus =
  | 'CREATED'
  | 'SAVED'
  | 'APPROVED'
  | 'VOIDED'
  | 'COMPLETED'
  | 'PAYER_ACTION_REQUIRED'
  | 'PENDING'
  | 'FAILED'
  | 'REFUNDED';

export type Incoterm =
  | 'EXW' // Ex Works
  | 'FCA' // Free Carrier
  | 'CPT' // Carriage Paid To
  | 'CIP' // Carriage and Insurance Paid To
  | 'DAP' // Delivered at Place
  | 'DPU' // Delivered at Place Unloaded
  | 'DDP' // Delivered Duty Paid
  | 'FAS' // Free Alongside Ship
  | 'FOB' // Free on Board
  | 'CFR' // Cost and Freight
  | 'CIF'; // Cost, Insurance and Freight

export type ActivityActor = 'system' | 'ai' | 'seller' | 'buyer' | 'paypal';

export type AIProvider = 'gemini' | 'openrouter' | 'fallback' | 'auto';

// =============================================================================
// 2. AI Extraction Data Models
// =============================================================================

export interface AIExtractedItem {
  description: string;
  sku?: string | null;
  quantity: number;
  unit_price_minor: number | null; // Cents; null if not explicitly stated in inquiry
  line_total_minor: number | null; // Cents; null if not explicitly stated in inquiry
  confidence?: number;
}

export interface AIEvidenceSnippet {
  field: string;
  snippet: string;
}

export interface AIExtractionResult {
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_company: string | null;
  destination_country: string | null; // ISO 3166-1 alpha-2, e.g. "AE"
  currency: string | null; // ISO 4217, e.g. "USD"
  items: AIExtractedItem[];
  shipping_minor: number | null; // Cents; null if unstated
  tax_minor: number | null; // Cents; null if unstated
  incoterm?: Incoterm | null;
  requested_delivery_date: string | null;
  notes: string | null;
  missing_fields: string[];
  evidence_snippets: AIEvidenceSnippet[];
  confidence_score: number; // 0.0 to 1.0
  is_fallback: boolean;
  provider_used?: string;
}

// =============================================================================
// 3. Supabase PostgreSQL Domain Models (Integer Minor Units)
// =============================================================================

export interface Profile {
  id: string; // references auth.users(id)
  business_name: string;
  contact_email: string | null;
  country_code: string; // ISO 3166-1 alpha-2, e.g. "IN"
  currency_preference: string; // ISO 4217, e.g. "USD"
  created_at: string;
  updated_at: string;
}

export interface Buyer {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  company_name: string | null;
  country_code: string; // e.g. "AE"
  phone: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    port_of_entry?: string;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  description: string;
  sku: string | null;
  quantity: number;
  unit_price_minor: number; // In cents/minor units (e.g. 3500 for $35.00)
  line_total_minor: number; // In cents/minor units (quantity * unit_price_minor)
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface PayPalPayment {
  id: string;
  order_id: string;
  paypal_order_id: string;
  paypal_capture_id: string | null;
  status: PaymentStatus;
  amount_minor: number; // In cents/minor units
  currency: string; // ISO 4217, e.g. "USD"
  approval_url: string | null;
  payer_email: string | null;
  payer_id: string | null;
  raw_status?: Record<string, unknown>;
  created_at: string;
  captured_at: string | null;
  updated_at: string;
}

export interface PayPalWebhookEvent {
  id: string;
  paypal_event_id: string;
  event_type: string;
  resource_id: string;
  verification_status: 'SUCCESS' | 'FAILURE' | 'SKIPPED_LOCAL_TEST';
  received_at: string;
  processed_at: string | null;
  payload: Record<string, unknown>;
  error_message: string | null;
}

export interface ActivityEvent {
  id: string;
  order_id: string;
  actor: ActivityActor;
  event_type: string; // e.g., 'order_parsed', 'quote_approved', 'checkout_created', 'payment_captured', 'webhook_reconciled'
  summary: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ExportOrder {
  id: string;
  owner_id: string;
  buyer_id: string | null;
  order_number: string; // e.g. "EXP-2026-001"
  source_message: string;
  destination_country: string; // e.g. "AE"
  currency: string; // e.g. "USD"
  subtotal_minor: number; // Cents
  shipping_minor: number; // Cents
  tax_minor: number; // Cents
  total_minor: number; // Cents (subtotal + shipping + tax)
  status: OrderStatus;
  incoterm?: Incoterm | null;
  ai_extraction: AIExtractionResult;
  ai_confidence: number | null;
  seller_notes: string | null;
  seller_approved_at: string | null;
  created_at: string;
  updated_at: string;

  // Hydrated relational relations
  buyer?: Buyer | null;
  items?: OrderItem[];
  payment?: PayPalPayment | null;
  activity_events?: ActivityEvent[];
}

// =============================================================================
// 4. API Request and Response Contracts
// =============================================================================

// POST /api/ai/parse-order
export interface ParseOrderRequest {
  text: string;
  provider?: AIProvider;
}

export interface ParseOrderResponse {
  success: boolean;
  data: AIExtractionResult;
  is_fallback: boolean;
  missing_fields: string[];
  provider_used?: string;
  latency_ms?: number;
  error?: string;
}

// POST /api/paypal/create-order
export interface CreatePayPalOrderRequest {
  order_id: string; // Internal export_orders UUID
}

export interface CreatePayPalOrderResponse {
  success: boolean;
  paypal_order_id: string;
  approve_url: string;
  amount_minor: number;
  currency: string;
  order_number?: string;
  error?: string;
}

// POST /api/paypal/capture-order
export interface CapturePayPalOrderRequest {
  order_id: string; // Internal export_orders UUID
  paypal_order_id: string;
}

export interface CapturePayPalOrderResponse {
  success: boolean;
  capture_id: string;
  status: string; // e.g. 'COMPLETED'
  reconciled: boolean;
  order_status: OrderStatus;
  amount_captured?: string;
  currency?: string;
  error?: string;
}

// POST /api/paypal/webhook
export interface PayPalWebhookHeaders {
  'paypal-transmission-id': string;
  'paypal-transmission-time': string;
  'paypal-cert-url': string;
  'paypal-auth-algo': string;
  'paypal-transmission-sig': string;
}

export interface PayPalWebhookResponse {
  received: boolean;
  status: 'processed' | 'duplicate' | 'ignored' | 'failed';
  event_id?: string;
  event_type?: string;
  error?: string;
}

// Order Mutation & Quotation Input Types
export interface UpdateQuotationInput {
  items: {
    description: string;
    sku?: string | null;
    quantity: number;
    unit_price_minor: number;
  }[];
  shipping_minor: number;
  tax_minor: number;
  incoterm?: Incoterm | null;
  seller_notes?: string | null;
}
