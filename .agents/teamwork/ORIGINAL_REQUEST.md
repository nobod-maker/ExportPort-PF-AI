# Original User Request

## Initial Request — 2026-11-09T11:16:23Z

You are the Lead Software Architect and Engineering Manager for ExportPilot PayFlow AI, a submission for PayPal AI Hackathon 2026.

I am a solo founder using Google Antigravity. Your mission is to build a complete, functional, polished hackathon application. Do not stop at a static mockup.

PROJECT GOAL:
Build an AI-powered export order and payment platform for small exporters. A UAE buyer submits an enquiry for 100 handmade leather wallets. AI extracts the order, the seller reviews and approves the quotation, PayPal Sandbox creates checkout, the buyer approves, the server captures payment, verified webhooks reconcile the transaction, and the dashboard updates.

TECH STACK:
Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL, Zod, PayPal Orders v2 Sandbox, AG Grid Community, and an AI provider adapter using OpenRouter free models or Gemini API free tier.

MULTI-AGENT TEAM:
Use Antigravity's built-in subagents and isolated Git worktrees.
1. Frontend Agent: responsive dashboard, order screens, forms, quotation UI, payment UI.
2. PayPal Agent: OAuth, order creation, capture, webhook verification, reconciliation.
3. AI/Database Agent: Supabase schema, RLS, extraction prompts, LLM provider adapter.
4. QA/Documentation Agent: tests, security audit, README, demo script and setup guide.
5. Lead Agent: shared types, architecture, integration, merging and final QA.

Do not allow concurrent agents to edit the same files. Require each agent to report changed files, tests, assumptions and blockers.

FEATURES:
- Exporter dashboard with order and payment KPIs.
- Paste buyer enquiry.
- AI extraction into structured order JSON.
- Editable buyer and product information.
- Missing-field detection.
- Seller-approved quotation.
- PayPal Sandbox checkout.
- Server-side capture.
- Verified PayPal webhook.
- Payment reconciliation.
- Order activity timeline.
- AI business assistant.
- Demo seed and reset.
- AG Grid order management.

DATABASE:
profiles, buyers, export_orders, order_items, paypal_payments, paypal_webhook_events, activity_events.
Create migrations, indexes, constraints and RLS.

API ROUTES:
POST /api/ai/parse-order
POST /api/paypal/create-order
POST /api/paypal/capture-order
POST /api/paypal/webhook

SECURITY:
Never expose secrets in browser code.
Never trust browser-supplied totals.
Use integer minor units for money.
Never fabricate missing prices.
Require seller approval.
Require buyer approval.
Verify PayPal webhook signatures.
Deduplicate webhook events.
Verify order ID, capture ID, amount and currency.
Never mark an order paid based only on a browser redirect.
Clearly label Sandbox payments.

AI:
Use strict structured JSON output.
Add provider timeout and fallback.
Use only explicit buyer-provided information.
Do not invent shipping costs, taxes, customs fees or delivery dates.
Use cached sample responses when provider quota is exhausted.
Never claim sample mode is a live LLM response.

DESIGN:
Premium international fintech SaaS.
Dark navy background, emerald accents, elegant typography, professional tables, clear charts, responsive layout, subtle animations.
Complete loading, error, empty and success states.
Avoid generic chatbot-only UI.

IMPLEMENTATION:
First inspect workspace and create a task plan.
Then create the repository structure and shared contracts.
Implement database and AI.
Implement PayPal.
Implement frontend.
Integrate all modules.
Run lint, typecheck and tests after every checkpoint.
Run an end-to-end Sandbox payment.
Test duplicate webhook, invalid signature, missing price, invalid AI output and currency mismatch.
Inspect browser screenshots and fix layout issues.

DELIVERABLES:
Complete source code.
Supabase SQL migrations.
.env.example.
MIT LICENSE.
Detailed README.
Architecture diagram.
Setup and deployment instructions.
Sandbox testing instructions.
Unit and integration tests.
Under-three-minute demo script.
Devpost submission description.

PRIORITIES:
P0: working PayPal payment lifecycle.
P1: AI extraction and quotation workflow.
P2: beautiful interface, AG Grid and business insights.

Do not spend time on optional features until P0 and P1 work.

FINAL REQUIREMENT:
Build, run, inspect, test and repair the actual project. Do not merely describe what should be built. If credentials are missing, identify exactly what I must provide. Report all genuinely working features, mocked features, and remaining blockers. Never claim success without testing.

read the folder
install this skill and use in this project -https://github.com/OpenHands/OpenHands.git
How the multi-agent development team should work
You are the project owner. Antigravity is your engineering team.
Use four agents, with one lead agent coordinating them.
Lead Agent — Architect & Integrator
Owns project structure, shared interfaces, integration and final quality checks.
Agent 1 — Frontend
Dashboard, forms, responsive design, charts, order screens.
Agent 2 — PayPal
OAuth, checkout, capture, webhook verification.
Agent 3 — AI & Database
LLM, prompts, Supabase, structured extraction.
Agent 4 — QA & Submission
Tests, security review, README, demo and documentation.
Important Antigravity instruction: Give each agent a separate Git worktree or branch. Have the lead agent review and merge the results. Don't let several agents independently rewrite the same files.
Google Antigravity Docs+1
4. Application architecture
[How to Build a Production-ready AI Agent: A Step-by-Step Hands-on Guide](https://images.openai.com/static-rsc-4/Xlu8DAHUrtjTS6572NxZ-3w_E0O7NM7wAkjwanmB2zVrLgsUg_q8kXr7T1omn2zSBvO8_b_UhTIpzOpb13A-QlhXSrP1d1E7QnRBTfv7QwoEZK2zcKc6UweCROHXuuGISQL7Zf1j5PeSQpen6yZebXM6L-cMNlqiYuzUBJboLe8?purpose=inline)
ask me if you have any question
