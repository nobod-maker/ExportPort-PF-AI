# Project: ExportPilot PayFlow AI (PayPal AI Hackathon 2026)

## Architecture
- **Framework**: Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Supabase PostgreSQL with 7 tables, check constraints, integer minor units (cents), and Row Level Security (RLS)
- **Payment Gateway**: PayPal Orders v2 Sandbox (OAuth 2.0, Create Order, Server Capture, Cryptographic Webhook Verification, 4-Way Reconciliation)
- **AI Engine**: Multi-provider LLM adapter (Gemini API free tier / OpenRouter free models / High-Fidelity Deterministic Fallback)
- **Data Grid**: AG Grid Community Edition
- **Multi-Agent Orchestration**: Isolated Git worktree/branches per domain agent (Lead, Frontend, PayPal, AI/DB, QA) with strict non-overlapping file boundaries.

```
                      [ User / Exporter ]
                              │
                    [ Next.js App Router ]
                  Dark Navy / Emerald Fintech
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
   [ AI Parser ]       [ Order Flow ]      [ PayPal Gateway ]
   Gemini/OpenRouter   Quotation Engine    OAuth 2.0 / Orders v2
   + Deterministic     Seller Approval     Server Capture
   Fallback            AG Grid Table       Webhook Verify API
          │                   │                    │
          └───────────────────┼────────────────────┘
                              ▼
                 [ Supabase PostgreSQL ]
               7 Tables • BigInt Minor Units
                 Strict RLS • Audit Log
```

---

## Feature Inventory
| # | Feature | Description | Priority | Milestone | Source |
|---|---------|-------------|:--------:|:---------:|:------:|
| 1 | Exporter KPI Dashboard | Total volume, active orders, pending quotations, escrow/captured payments with dark navy/emerald theme | P2 | M4 | Survey / Blueprint §5 |
| 2 | Raw Enquiry Intake | Multiline enquiry pastebox with quick-fill UAE leather wallet sample button | P1 | M4 | Survey / Blueprint §6 |
| 3 | AI Structured Extraction | Zod-validated JSON extraction of buyer details, products, quantities; null for unstated fields | P1 | M2 | Survey / Blueprint §8 |
| 4 | AI Deterministic Fallback | High-fidelity UAE order sample response when LLM free quota is exhausted; transparent fallback banner | P1 | M2 | Survey / Blueprint §8 |
| 5 | Missing-Field Detection | Automated alerts highlighting missing unit price, shipping terms, Incoterms, delivery dates | P1 | M2, M4 | Survey / Blueprint §9 |
| 6 | Interactive Quotation Form | Exporter adjusts unit prices, currency, shipping fees, tax rates; client totals never authoritative | P1 | M4 | Survey / Blueprint §9 |
| 7 | Server Total Recalculation | Server computes subtotal, shipping, tax, and grand total in integer minor units (cents) | P0 | M1, M2 | Survey / Blueprint §9 |
| 8 | Explicit Seller Approval Gate | Transition order from `draft`/`analyzed` to `quoted` state, generating immutable quotation snapshot | P1 | M2, M4 | Survey / Blueprint §9 |
| 9 | PayPal Orders v2 Creation | `POST /api/paypal/create-order` creates PayPal Sandbox order with `intent: CAPTURE` and server totals | P0 | M3 | Survey / Blueprint §10 |
| 10 | Buyer PayPal Checkout UI | PayPal Buttons integration; buyer approves order in PayPal Sandbox modal/popup | P0 | M4 | Survey / Blueprint §10 |
| 11 | Server-Side PayPal Capture | `POST /api/paypal/capture-order` invokes PayPal capture API with idempotency key `PayPal-Request-Id` | P0 | M3 | Survey / Blueprint §10 |
| 12 | Cryptographic Webhook Verify | `POST /api/paypal/webhook` validates signatures using PayPal's `/v1/notifications/verify-webhook-signature` | P0 | M3 | Survey / Blueprint §11 |
| 13 | Webhook Event Deduplication | Atomic deduplication via unique `paypal_event_id` in `paypal_webhook_events` table | P0 | M3 | Survey / Blueprint §11 |
| 14 | 4-Way Payment Reconciliation | Verifies order ID, capture ID, amount, and currency against DB before updating status to `paid` | P0 | M3 | Survey / Blueprint §11 |
| 15 | Order Activity Timeline | Chronological event log tracking extraction, quotation, approval, checkout, capture, and reconciliation | P2 | M4 | Survey / Blueprint §12 |
| 16 | AG Grid Order Management | Enterprise-grade grid with filtering, column sorting, pagination, and status badges | P2 | M4 | Survey / Blueprint §13 |
| 17 | AI Business Assistant | Trade & finance chat assistant answering queries regarding orders, buyers, Incoterms, and margins | P2 | M2, M4 | Survey / Blueprint §14 |
| 18 | Demo Seed & Reset Controls | One-click seed script populating 5 realistic export orders and reset mechanism | P2 | M2, M4 | Survey / Blueprint §15 |
| 19 | Sandbox Payment Banners | Prominent indicators in UI and receipts clearly stating Sandbox Environment | P0 | M4 | Survey / Blueprint §10 |
| 20 | Commercial Invoice Generator | Printable/PDF export-compliant invoice with HS codes, buyer address, and payment capture receipt | P2 | M4 | Survey / Blueprint §16 |
| 21 | Security & Injection Guard | Defense against prompt injection, client total tampering, and unauthorized data access | P0 | M1, M2, M3 | Survey / Blueprint §17 |
| 22 | Automated E2E Testing Suite | Playwright & Vitest test harness covering Tiers 1-4 + Tier 5 Adversarial Hardening | P0/P1 | M5 | Survey / Blueprint §18 |
| 23 | Submission Documentation | Architecture diagram, setup guide, README, 3-min video demo script, Devpost submission pitch | P0/P1/P2 | M6 | Survey / Blueprint §19-20 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Foundation & Shared Contracts | Git init, Next.js App Router scaffold, Tailwind CSS, shadcn/ui base, shared TypeScript contracts (`types/index.ts`), minor-unit money utilities (`lib/money.ts`), Zod schemas (`lib/validation/order.ts`), mock data seeds (`lib/mock-data.ts`), and baseline build verification. | None | PLANNED |
| M2 | AI Extraction & Supabase DB Module | Supabase SQL migrations (7 tables, constraints, RLS), Supabase client, AI multi-provider adapter (Gemini / OpenRouter / Deterministic Fallback), `POST /api/ai/parse-order`, and AI assistant API. | M1 | PLANNED |
| M3 | PayPal Sandbox & Webhook Reconciliation Module | PayPal OAuth caching, Orders v2 client, `POST /api/paypal/create-order`, `POST /api/paypal/capture-order`, `POST /api/paypal/webhook`, cryptographic signature verification, event deduplication, and 4-way reconciliation logic. | M1 | PLANNED |
| M4 | Frontend Fintech UI, Quotation, AG Grid & Checkout | Dark navy/emerald layout, Exporter KPI dashboard, raw enquiry intake, quotation editor, PayPal buttons integration, AG Grid table, timeline component, AI assistant widget, and demo controls. | M1 | PLANNED |
| M5 | Dual Track E2E Testing & Adversarial Hardening | End-to-end integration and API tests across Tiers 1-4 (feature coverage, edge cases, cross-feature flows, real-world UAE wallet scenario) + Tier 5 white-box adversarial stress tests. | M2, M3, M4 | PLANNED |
| M6 | Final Integration, Audit & Submission Package | Merge branches to `main`, verify lint/typecheck/build, security audit, README.md, architecture diagrams, setup/sandbox guide, timed demo script, and Devpost text. | M5 | PLANNED |

---

## Interface Contracts

### 1. Data Models (`types/index.ts`)
- **Money Representation**: Integer minor units (`bigint` in SQL, `number` integer in TypeScript, e.g. `$35.00` = `3500`).
- **OrderStatus**: `'draft' | 'analyzed' | 'quoted' | 'payment_pending' | 'paid' | 'cancelled' | 'refunded'`
- **PaymentStatus**: `'pending' | 'completed' | 'failed' | 'refunded'`

### 2. API Routes
- `POST /api/ai/parse-order`:
  - Request: `{ text: string, provider?: 'gemini' | 'openrouter' | 'fallback' }`
  - Response: `{ success: boolean, data: AIExtractionResult, is_fallback: boolean, missing_fields: string[] }`
- `POST /api/paypal/create-order`:
  - Request: `{ order_id: string }` (internal export_orders ID)
  - Response: `{ success: boolean, paypal_order_id: string, approve_url: string }`
  - Guard: Server loads order from DB, recomputes totals from items, requires `status === 'quoted'`.
- `POST /api/paypal/capture-order`:
  - Request: `{ paypal_order_id: string, order_id: string }`
  - Response: `{ success: boolean, capture_id: string, status: string, reconciled: boolean }`
- `POST /api/paypal/webhook`:
  - Request: PayPal webhook event JSON payload with headers (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`)
  - Response: `{ received: boolean, status: 'processed' | 'duplicate' | 'ignored' }`

---

## Code Layout
```
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx        # Exporter KPI Dashboard
│   │   ├── orders/
│   │   │   ├── page.tsx              # Orders list with AG Grid
│   │   │   ├── new/page.tsx          # Raw enquiry intake & AI extraction
│   │   │   └── [id]/
│   │   │       ├── quote/page.tsx    # Quotation review & pricing editor
│   │   │       └── pay/page.tsx      # PayPal checkout & receipt
│   │   └── assistant/page.tsx        # AI Business Assistant
│   ├── api/
│   │   ├── ai/
│   │   │   ├── parse-order/route.ts  # LLM extraction
│   │   │   └── assistant/route.ts    # AI business assistant
│   │   └── paypal/
│   │       ├── create-order/route.ts # PayPal order creation
│   │       ├── capture-order/route.ts# PayPal server capture
│   │       └── webhook/route.ts      # PayPal webhook verification
│   ├── layout.tsx                    # Root layout (Fintech Dark Navy theme)
│   └── page.tsx                      # Landing / redirect to dashboard
├── components/
│   ├── ui/                           # Button, Card, Badge, Dialog, Input, Table
│   ├── navbar.tsx                    # Top navigation & sandbox badge
│   ├── sidebar.tsx                   # Main navigation sidebar
│   ├── orders-grid.tsx               # AG Grid Community implementation
│   ├── order-timeline.tsx            # Visual activity & audit timeline
│   ├── quotation-editor.tsx          # Quotation form with auto-recalc
│   ├── paypal-checkout-button.tsx    # PayPal Smart Buttons wrapper
│   └── ai-assistant-widget.tsx       # Floating AI trade assistant
├── lib/
│   ├── money.ts                      # Minor-unit arithmetic & formatting
│   ├── types.ts                      # Domain entities & shared contracts
│   ├── mock-data.ts                  # Seed data & deterministic UAE wallet sample
│   ├── validation/
│   │   └── order.ts                  # Zod schemas for order & extraction
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (anon key)
│   │   └── server.ts                 # Server client (service role key)
│   ├── ai/
│   │   ├── provider.ts               # Gemini / OpenRouter / Fallback adapter
│   │   └── prompts.ts                # Zero-hallucination extraction prompts
│   └── paypal/
│       ├── client.ts                 # PayPal OAuth & fetch wrapper
│       ├── orders.ts                 # Create & Capture server helpers
│       └── webhooks.ts               # Cryptographic verification & reconciliation
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Complete SQL DDL, indexes, constraints, RLS
├── tests/
│   ├── e2e/                          # Playwright end-to-end tests
│   └── unit/                         # Vitest unit & contract tests
├── .env.example
├── README.md
└── package.json
```
