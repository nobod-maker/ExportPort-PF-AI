# BRIEFING — 2026-11-09T11:16:00Z

## Mission
Oversee execution of ExportPilot PayFlow AI via Project Orchestrator, monitoring progress and running independent victory audit upon completion.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: d:\ExportPilot PayFlow AI\.agents\teamwork\
- Orchestrator: 5e5ca37c-d275-4ce0-bb26-2c11af4f9753
- Victory Auditor: [to be spawned on victory claim]

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Never expose secrets in browser code
- Never trust browser-supplied totals
- Use integer minor units for money
- Never fabricate missing prices
- Require seller approval and buyer approval
- Verify PayPal webhook signatures and deduplicate events
- Verify order ID, capture ID, amount and currency
- Never mark an order paid based only on a browser redirect
- Clearly label Sandbox payments
- Strict structured JSON AI output; do not invent costs/taxes/delivery dates
- Priorities: P0 (PayPal payment lifecycle), P1 (AI extraction & quotation), P2 (interface, AG Grid, insights)

## User Context
- **Last user request**: Confirmed. Please route and proceed with the request as received.
- **Pending clarifications**: none
- **Delivered results**: [none]

## Project Status
- **Phase**: Milestone 1 — Repository Foundation & Shared Contracts (worker_m1_foundation active: git init, Next.js App Router scaffold, Tailwind dark navy/emerald, zod/supabase/paypal/ag-grid dependencies, types/index.ts, lib/money.ts integer minor units, feature branches)
- **Routing Decision**: General path -> teamwork_orchestrator
- **Rationale**: Full-stack SWE project requiring architecture, backend, frontend, database, PayPal integration, and testing.

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- .agents/teamwork/ORIGINAL_REQUEST.md — Authoritative user requirements record
