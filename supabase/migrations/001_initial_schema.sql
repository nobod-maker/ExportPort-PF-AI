-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core Schema for ExportPilot PayFlow AI
-- Platform: Supabase PostgreSQL (Strict Minor Units, Indexes, Constraints & RLS)
-- =============================================================================

-- Enable required cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Table 1: profiles
-- Linked 1-to-1 with Supabase auth.users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL DEFAULT 'My Export Business',
    contact_email TEXT,
    country_code CHAR(2) NOT NULL DEFAULT 'IN',
    currency_preference CHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table 2: buyers
-- Customer directory for international importers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    company_name TEXT,
    country_code CHAR(2) NOT NULL, -- ISO-3166-1 alpha-2, e.g., 'AE' for UAE
    phone TEXT,
    address JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_owner_id ON public.buyers(owner_id);
CREATE INDEX IF NOT EXISTS idx_buyers_email ON public.buyers(email);
CREATE INDEX IF NOT EXISTS idx_buyers_country_code ON public.buyers(country_code);

-- -----------------------------------------------------------------------------
-- Table 3: export_orders
-- Central export order ledger tracking quotes, statuses, and calculations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.export_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.buyers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL UNIQUE, -- e.g. 'EXP-2026-001'
    source_message TEXT NOT NULL,
    destination_country CHAR(2) NOT NULL, -- ISO-3166-1 alpha-2
    currency CHAR(3) NOT NULL DEFAULT 'USD', -- ISO-4217
    subtotal_minor BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
    shipping_minor BIGINT NOT NULL DEFAULT 0 CHECK (shipping_minor >= 0),
    tax_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
    total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
    status TEXT NOT NULL CHECK (
        status IN (
            'draft',
            'analyzed',
            'quoted',
            'awaiting_payment',
            'paid',
            'cancelled',
            'refunded',
            'needs_review'
        )
    ) DEFAULT 'draft',
    incoterm TEXT CHECK (
        incoterm IS NULL OR incoterm IN (
            'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'
        )
    ),
    ai_extraction JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_confidence NUMERIC(4, 3) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
    seller_notes TEXT,
    seller_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_orders_owner_id ON public.export_orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_export_orders_buyer_id ON public.export_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_export_orders_status ON public.export_orders(status);
CREATE INDEX IF NOT EXISTS idx_export_orders_order_number ON public.export_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_export_orders_created_at ON public.export_orders(created_at DESC);

-- -----------------------------------------------------------------------------
-- Table 4: order_items
-- Itemized goods breakdown per order with integer minor unit math
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.export_orders(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
    line_total_minor BIGINT NOT NULL CHECK (line_total_minor = quantity * unit_price_minor),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- -----------------------------------------------------------------------------
-- Table 5: paypal_payments
-- Immutable link between internal export orders and PayPal Orders v2 transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paypal_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.export_orders(id) ON DELETE CASCADE,
    paypal_order_id TEXT NOT NULL UNIQUE,
    paypal_capture_id TEXT UNIQUE,
    status TEXT NOT NULL CHECK (
        status IN (
            'CREATED',
            'SAVED',
            'APPROVED',
            'VOIDED',
            'COMPLETED',
            'PAYER_ACTION_REQUIRED',
            'PENDING',
            'FAILED',
            'REFUNDED'
        )
    ),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL,
    approval_url TEXT,
    payer_email TEXT,
    payer_id TEXT,
    raw_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    captured_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paypal_payments_order_id ON public.paypal_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_paypal_payments_paypal_order_id ON public.paypal_payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_paypal_payments_paypal_capture_id ON public.paypal_payments(paypal_capture_id);
CREATE INDEX IF NOT EXISTS idx_paypal_payments_status ON public.paypal_payments(status);

-- -----------------------------------------------------------------------------
-- Table 6: paypal_webhook_events
-- Idempotent audit log for all incoming PayPal webhook deliveries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paypal_event_id TEXT NOT NULL UNIQUE, -- Crucial for atomic deduplication
    event_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    verification_status TEXT NOT NULL CHECK (
        verification_status IN ('SUCCESS', 'FAILURE', 'SKIPPED_LOCAL_TEST')
    ),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    payload JSONB NOT NULL,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.paypal_webhook_events(paypal_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_resource_id ON public.paypal_webhook_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.paypal_webhook_events(event_type);

-- -----------------------------------------------------------------------------
-- Table 7: activity_events
-- Chronological order audit timeline and operational trail
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.export_orders(id) ON DELETE CASCADE,
    actor TEXT NOT NULL CHECK (actor IN ('system', 'ai', 'seller', 'buyer', 'paypal')),
    event_type TEXT NOT NULL, -- e.g., 'order_parsed', 'quote_approved', 'checkout_created', 'payment_captured', 'webhook_reconciled'
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_order_id ON public.activity_events(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events(created_at DESC);

-- -----------------------------------------------------------------------------
-- Automated updated_at Triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_buyers_updated_at ON public.buyers;
CREATE TRIGGER trg_buyers_updated_at BEFORE UPDATE ON public.buyers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_export_orders_updated_at ON public.export_orders;
CREATE TRIGGER trg_export_orders_updated_at BEFORE UPDATE ON public.export_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_paypal_payments_updated_at ON public.paypal_payments;
CREATE TRIGGER trg_paypal_payments_updated_at BEFORE UPDATE ON public.paypal_payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paypal_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Authenticated users manage only their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. Buyers: Isolated by owner_id
CREATE POLICY "Users can view own buyers" ON public.buyers
    FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own buyers" ON public.buyers
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own buyers" ON public.buyers
    FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own buyers" ON public.buyers
    FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 3. Export Orders: Isolated by owner_id
CREATE POLICY "Users can view own orders" ON public.export_orders
    FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own orders" ON public.export_orders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own orders" ON public.export_orders
    FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own orders" ON public.export_orders
    FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 4. Order Items: Permitted if user owns the parent export_order
CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.export_orders
            WHERE export_orders.id = order_items.order_id
            AND export_orders.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own order items" ON public.order_items
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.export_orders
            WHERE export_orders.id = order_items.order_id
            AND export_orders.owner_id = auth.uid()
        )
    );

-- 5. PayPal Payments: Read-only for authenticated owner; mutations strictly via service_role
CREATE POLICY "Users can view own paypal payments" ON public.paypal_payments
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.export_orders
            WHERE export_orders.id = paypal_payments.order_id
            AND export_orders.owner_id = auth.uid()
        )
    );

-- 6. PayPal Webhook Events: Server-side only
-- No public policies created -> only service_role key can read/write

-- 7. Activity Events: Users can view and append timeline of orders they own
CREATE POLICY "Users can view own activity events" ON public.activity_events
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.export_orders
            WHERE export_orders.id = activity_events.order_id
            AND export_orders.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert activity events for own orders" ON public.activity_events
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.export_orders
            WHERE export_orders.id = activity_events.order_id
            AND export_orders.owner_id = auth.uid()
        )
    );
