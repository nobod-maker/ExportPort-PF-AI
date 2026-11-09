## 2026-11-09T12:40:35Z
You are worker_m2_aidb, working in directory:
d:\ExportPilot PayFlow AI\.agents\teamwork\worker_m2_aidb\

Mandatory Inputs:
1. Read the verbatim user request at:
   d:\ExportPilot PayFlow AI\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the master architecture and contracts at:
   d:\ExportPilot PayFlow AI\.agents\teamwork\PROJECT.md
3. Review survey architecture at:
   d:\ExportPilot PayFlow AI\.agents\teamwork\teamwork_explorer_survey_2\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Milestone Objective:
Implement Milestone 2: AI Extraction & Supabase Database Module for ExportPilot PayFlow AI.
Git Branch: Switch to `feature/ai-db` (`git checkout feature/ai-db`).

Exclusive File Ownership:
- `supabase/migrations/001_initial_schema.sql`
- `lib/supabase/client.ts` & `lib/supabase/server.ts`
- `lib/ai/prompts.ts` & `lib/ai/provider.ts`
- `app/api/ai/parse-order/route.ts` & `app/api/ai/assistant/route.ts`
- `tests/unit/ai-db.test.ts`

Tasks to Implement:
1. Supabase PostgreSQL Schema:
   - Create `supabase/migrations/001_initial_schema.sql` implementing all 7 required tables: `profiles`, `buyers`, `export_orders`, `order_items`, `paypal_payments`, `paypal_webhook_events`, `activity_events`.
   - Enforce check constraints, foreign keys, indexes, and RLS policies (`owner_id = auth.uid()`). Monetary values must be integer minor units (`bigint`).
2. Supabase Client Helpers:
   - In `lib/supabase/client.ts` and `lib/supabase/server.ts`, create standard Supabase client initializers. Include graceful fallback/in-memory repository simulation when `NEXT_PUBLIC_SUPABASE_URL` is not configured, so local development and demo seeding run seamlessly.
3. Multi-Provider AI Adapter:
   - In `lib/ai/provider.ts`, implement multi-provider LLM support: Google Gemini API (free tier) and OpenRouter free models.
   - Zero-hallucination guardrail: enforce extraction of ONLY buyer-stated data. Do NOT fabricate prices, shipping, or taxes; unstated fields must be `null` and cataloged in `missing_fields`.
   - High-fidelity deterministic fallback: when API keys are missing or quota is exhausted, fall back to the authoritative UAE leather wallet inquiry (`AUTHORITATIVE_UAE_EXTRACTION` in `lib/mock-data.ts`) with `is_fallback: true`.
4. API Route Handlers:
   - `POST /api/ai/parse-order`: Parse raw enquiry text, validate input with Zod, extract structured JSON, and return validation result.
   - `POST /api/ai/assistant`: AI business assistant providing trade, Incoterms, and quotation advice.
5. Unit Tests:
   - Create `tests/unit/ai-db.test.ts` verifying SQL syntax/structure, AI extraction parsing, missing-field detection, and fallback mechanics.
   - Run `npm test` and `npm run build` to confirm zero errors.
   - Commit changes to `feature/ai-db`: `git add . && git commit -m "feat(ai-db): implement supabase schema, rls, ai adapter, and api routes"`.

Deliverables:
- Write detailed handoff report to:
  `d:\ExportPilot PayFlow AI\.agents\teamwork\worker_m2_aidb\handoff.md`.
- Send completion message to orchestrator.
