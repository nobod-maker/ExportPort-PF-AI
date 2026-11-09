# BRIEFING — 2026-11-09T12:42:00Z

## Mission
Implement Milestone 2: AI Extraction & Supabase Database Module for ExportPilot PayFlow AI on branch `feature/ai-db`.

## 🔒 My Identity
- Archetype: worker_m2_aidb
- Roles: implementer, qa, specialist
- Working directory: d:\ExportPilot PayFlow AI\.agents\teamwork\worker_m2_aidb
- Original parent: 5e5ca37c-d275-4ce0-bb26-2c11af4f9753
- Milestone: Milestone 2 - AI Extraction & Supabase Database Module

## 🔒 Key Constraints
- DO NOT CHEAT. All implementations must be genuine. No hardcoded test results, dummy facades, or shortcuts.
- Monetary values must be integer minor units (`bigint` in PostgreSQL).
- Zero-hallucination guardrail: enforce extraction of ONLY buyer-stated data. Do NOT fabricate prices, shipping, or taxes; unstated fields must be `null` and cataloged in `missing_fields`.
- High-fidelity deterministic fallback: when API keys are missing or quota is exhausted, fall back to the authoritative UAE leather wallet inquiry (`AUTHORITATIVE_UAE_EXTRACTION` in `lib/mock-data.ts`) with `is_fallback: true`.
- RLS policies must enforce `owner_id = auth.uid()`.
- Exclusive file ownership:
  - `supabase/migrations/001_initial_schema.sql`
  - `lib/supabase/client.ts` & `lib/supabase/server.ts`
  - `lib/ai/prompts.ts` & `lib/ai/provider.ts`
  - `app/api/ai/parse-order/route.ts` & `app/api/ai/assistant/route.ts`
  - `tests/unit/ai-db.test.ts`
- Must pass `npm test` and `npm run build`.
- Commit changes to `feature/ai-db`.

## Current Parent
- Conversation ID: 5e5ca37c-d275-4ce0-bb26-2c11af4f9753
- Updated: 2026-11-09T12:42:00Z

## Task Summary
- **What to build**: Supabase PostgreSQL schema (7 tables, RLS, indexes, constraints), Supabase client/server helpers with fallback in-memory repo simulation, Multi-provider LLM adapter (Gemini API free tier, OpenRouter free models, deterministic UAE fallback, zero-hallucination prompt), API route handlers (`/api/ai/parse-order`, `/api/ai/assistant`), and unit tests (`tests/unit/ai-db.test.ts`).
- **Success criteria**: All 7 tables defined with constraints, RLS, indexes; Gemini & OpenRouter adapter with robust zero-hallucination extraction and fallback; API routes functional with Zod validation; Unit tests pass covering schema structure, extraction parsing, missing fields, and fallback; `npm test` and `npm run build` pass.
- **Interface contracts**: `.agents/teamwork/PROJECT.md`
- **Code layout**: `.agents/teamwork/PROJECT.md`

## Key Decisions Made
- [Pending investigation of current repository state and existing files]

## Artifact Index
- `.agents/teamwork/worker_m2_aidb/DISPATCH.md` — Dispatch instructions
- `.agents/teamwork/worker_m2_aidb/BRIEFING.md` — Agent briefing & situational awareness
- `.agents/teamwork/worker_m2_aidb/progress.md` — Progress log & heartbeat
- `.agents/teamwork/worker_m2_aidb/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None yet

## Loaded Skills
- None specified in dispatch
