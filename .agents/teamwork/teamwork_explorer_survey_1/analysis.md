# ExportPilot PayFlow AI — Workspace & Environment Survey Report

**Author**: teamwork_explorer_survey_1  
**Date**: 2026-11-09  
**Parent Orchestrator**: `5e5ca37c-d275-4ce0-bb26-2c11af4f9753`  
**Mission**: Comprehensive survey of repository root, git/worktree infrastructure, system runtimes, OpenHands integration analysis, and multi-agent architectural boundaries.

---

## 1. Executive Summary

ExportPilot PayFlow AI is a Greenfield full-stack application submission for the PayPal AI Hackathon 2026. The workspace root (`d:\ExportPilot PayFlow AI`) currently contains project planning documentation and LLM guidelines, but has not yet been initialized with a git repository, `package.json`, or Next.js application scaffold. Modern developer runtimes (Node.js 22 LTS, npm 11, Python 3.12, Docker 28, git 2.48) are installed and operational.

To fulfill the user's directive for isolated multi-agent worktrees and autonomous collaboration, the Lead Agent / Orchestrator must immediately initialize the git repository (`git init`), create a baseline `.gitignore` and scaffold, commit the initial structure, and create dedicated feature branches or worktrees. OpenHands patterns (microagents, progressive disclosure via `SKILL.md`, event streams, and strict verification loops) can be directly embodied in this project's architecture through Supabase `activity_events` audit logging and role-isolated subagents.

---

## 2. Workspace File Inventory & Current State

### Files in Workspace Root (`d:\ExportPilot PayFlow AI\`)
1. **`ExportPilot_PayFlow_AI_Implementation_Blueprint.docx`** (45,623 bytes)
   - Comprehensive 252-segment project specification outlining the entire application: executive decision, UAE-to-India leather wallet demo scenario, Next.js App Router architecture, Supabase schema (7 tables: `profiles`, `buyers`, `export_orders`, `order_items`, `paypal_payments`, `paypal_webhook_events`, `activity_events`), PayPal Orders v2 Sandbox integration contract, AI prompts & structured extraction schemas, acceptance gates, and a 3-minute demo storyboard.
2. **`claude.md`** (2,420 bytes)
   - Coding guidelines enforcing: Think Before Coding, Simplicity First, Surgical Changes, and Goal-Driven Execution with verification criteria.
3. **`.agents/teamwork/`** (Directory)
   - `ORIGINAL_REQUEST.md`: Verbatim user prompt detailing hackathon priorities (P0 PayPal payment lifecycle, P1 AI extraction & quote approval, P2 AG Grid & insights), multi-agent instructions, and OpenHands references.
   - `BRIEFING.md`: Sentinel briefing maintaining top-level mission and constraints.
   - Subagent directories: `orchestrator/`, `teamwork_explorer_survey_1/`, `teamwork_explorer_survey_2/`, `teamwork_spec_miner_survey_3/`.

### Missing Application Artifacts
- **No `package.json`**: Node.js project has not yet been initialized.
- **No Next.js application skeleton**: No `app/`, `components/`, or `lib/` directories exist in the workspace root.
- **No `.gitignore`**: Git ignore rules must be created before running scaffolding tools.
- **No `.env` or `.env.example`**: Environment template has not yet been created.

---

## 3. Git Status & Worktree Analysis

### Observations:
- **Git Binary**: `git version 2.48.1.windows.1` is installed and functional.
- **Git User Config**: Configured with `user.name = nobod-maker` and `user.email = ss7561290@gmail.com`.
- **Repository State**: `fatal: not a git repository (or any of the parent directories): .git`.
- **Worktree Capability**: `git worktree` commands fail with fatal error because there is no `.git` repository and no initial commit.

### Strategic Requirement for Multi-Agent Worktrees:
In Git, `git worktree add <path> <branch>` requires:
1. An initialized repository (`git init`).
2. At least one valid commit on the primary branch (e.g., `main`).
3. An established root `.gitignore` to prevent worktrees from attempting to checkout heavy ignored directories (like `node_modules`).

### Recommendation:
The Orchestrator / Lead Agent must execute the following setup sequence before launching implementation agents into separate worktrees:
```bash
git init -b main
# Create .gitignore (excluding node_modules, .next, .env*.local, etc.)
git add ExportPilot_PayFlow_AI_Implementation_Blueprint.docx claude.md .agents/
git commit -m "chore: initial commit with specification blueprint and agent metadata"
```
After this initial commit, isolated worktrees can be cleanly provisioned:
```bash
git worktree add ../ExportPilot-frontend -b feature/frontend
git worktree add ../ExportPilot-paypal -b feature/paypal
git worktree add ../ExportPilot-ai-db -b feature/ai-db
git worktree add ../ExportPilot-qa -b feature/qa-submission
```

---

## 4. System Tooling, Runtimes & MCP Capabilities

| Tool / Runtime | Installed Version | Status / Notes |
|---|---|---|
| **Node.js** | `v22.14.0` | Active (LTS Node 22, supports native fetch, ES modules, top-level await) |
| **npm** | `11.3.0` | Available as the primary package manager |
| **npx** | `11.3.0` | Available for executing scaffolding (`create-next-app`, shadcn-ui) |
| **pnpm / yarn / bun** | *Not installed* | Use standard `npm` across all agents |
| **Python** | `3.12.9` | Active (useful for automation scripts, data utilities) |
| **Docker** | `28.0.4` (build b8034c0) | Active (available if local Supabase or containerized services are desired) |
| **curl** | `8.13.0` | Active for API endpoint verification and HTTP checks |
| **Network (npm registry)** | Reachable | TCP port 443 connection to `registry.npmjs.org` succeeded |
| **Supabase CLI** | *Not in global PATH* | Use `npx supabase` or the native `supabase-mcp-server` MCP tool suite |
| **Playwright MCP** | Connected | Full browser automation (`browser_navigate`, `browser_click`, `browser_take_screenshot`) available for E2E testing |
| **Supabase MCP** | Connected | Database tools (`execute_sql`, `apply_migration`, `list_tables`) available |
| **Stitch MCP** | Connected | Design systems, screen generation tools available |

### Environment Variables & Credentials Status:
- Currently, only `ANTIGRAVITY_GEMINI_DIR` is present in the environment.
- No PayPal Sandbox credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`), Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), or LLM keys (`LLM_API_KEY`) are present in system environment variables.
- In accordance with the blueprint: **The application must support complete integration code with a robust, clearly labeled deterministic mock mode for offline replay and verification when live credentials are not provided.**

---

## 5. OpenHands Repository & Skill Integration Evaluation

### User Prompt Reference:
> *"install this skill and use in this project - https://github.com/OpenHands/OpenHands.git"*

### Analysis & Technical Reality:
1. **Repository Scope**: `OpenHands/OpenHands` (formerly OpenDevin) is a complete autonomous software development agent platform implemented in Python and React with Docker container orchestration. It is not an individual installable npm package or single skill script.
2. **Skill / Microagent Architecture in OpenHands**:
   - In OpenHands, skills (formerly microagents) follow the standard open specification: Markdown files with YAML frontmatter (`SKILL.md`), keyword triggers, file path filters, and repo-level guidelines (`AGENTS.md`).
   - The user's system (`C:\Users\ADMIN\.gemini\config\skills\` and `plugins\`) already operates on this exact same specification, with over 200 production skills already registered (including `agency-backend-architect`, `agency-frontend-developer`, `agency-api-tester`, `coderabbit`, `gsd`, `ralph-loop`, and `taste-skill`).
3. **Core Architectural Adaptations for ExportPilot PayFlow AI**:
   - **Pattern 1: Event-Stream Architecture**: OpenHands uses an append-only event stream (Action/Observation/Audit). We map this directly to the application domain via the Supabase `activity_events` and `paypal_webhook_events` tables, creating an immutable audit trail for every order state transition.
   - **Pattern 2: Microagent Specialization**: OpenHands decomposes complex problems into specialized agents. We adapt this into our 4 dedicated engineering roles (Frontend, PayPal, AI/DB, QA) plus a Lead Integrator.
   - **Pattern 3: Human-in-the-Loop Guardrails**: OpenHands requires human confirmation before executing high-risk operations. In ExportPilot PayFlow AI, this is enforced at two critical checkpoints:
     1. Seller must review and approve the quotation before PayPal order creation.
     2. Buyer must approve checkout before server captures payment.
     3. No autonomous funds capture is ever permitted.
   - **Pattern 4: CodeAct & Progressive Disclosure**: Agents operate under typed JSON interfaces, verifying each step with automated tests before progressing.

---

## 6. Multi-Agent Architectural Boundaries & File Ownership

To strictly enforce the rule *"Do not allow concurrent agents to edit the same files. Require each agent to report changed files, tests, assumptions and blockers"*, the following boundaries and file contracts are established:

```
exportpilot-payflow-ai/
├── app/
│   ├── (marketing)/page.tsx                  [Agent 1: Frontend]
│   ├── dashboard/page.tsx                    [Agent 1: Frontend]
│   ├── orders/
│   │   ├── new/page.tsx                      [Agent 1: Frontend]
│   │   └── [id]/page.tsx                     [Agent 1: Frontend]
│   ├── settings/page.tsx                     [Agent 1: Frontend]
│   └── api/
│       ├── ai/parse-order/route.ts           [Agent 3: AI & DB]
│       └── paypal/
│           ├── create-order/route.ts         [Agent 2: PayPal]
│           ├── capture-order/route.ts        [Agent 2: PayPal]
│           └── webhook/route.ts              [Agent 2: PayPal]
├── components/
│   ├── dashboard/                            [Agent 1: Frontend]
│   ├── orders/                               [Agent 1: Frontend]
│   ├── payments/                             [Agent 1: Frontend]
│   └── ui/                                   [Agent 1: Frontend]
├── lib/
│   ├── money.ts                              [Lead Agent]
│   ├── types.ts                              [Lead Agent]
│   ├── validation/order.ts                   [Lead Agent]
│   ├── paypal/
│   │   ├── client.ts                         [Agent 2: PayPal]
│   │   ├── orders.ts                         [Agent 2: PayPal]
│   │   └── webhooks.ts                       [Agent 2: PayPal]
│   ├── db/
│   │   └── supabase-server.ts                [Agent 3: AI & DB]
│   ├── ai/
│   │   ├── provider.ts                       [Agent 3: AI & DB]
│   │   └── prompts.ts                        [Agent 3: AI & DB]
│   └── seed/
│       └── seed-data.ts                      [Agent 3: AI & DB]
├── supabase/
│   └── migrations/                           [Agent 3: AI & DB]
├── tests/
│   ├── unit/                                 [Agent 4: QA]
│   ├── integration/                          [Agent 4: QA]
│   └── e2e/                                  [Agent 4: QA]
├── docs/                                     [Agent 4: QA]
├── package.json, tsconfig.json, tailwind...  [Lead Agent]
└── README.md, LICENSE, .env.example          [Lead Agent / Agent 4]
```

### Detailed Agent Roles & Deliverables:

#### 1. Lead Agent (Architecture, Shared Contracts & Integration)
- **Files Owned**: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `components.json`, `lib/types.ts`, `lib/money.ts`, `lib/validation/order.ts`, `.env.example`, `LICENSE`.
- **Responsibilities**:
  - Scaffolds the Next.js App Router application.
  - Defines single-source-of-truth TypeScript definitions for orders, items, payments, webhooks, and events.
  - Implements integer minor-unit money arithmetic (`lib/money.ts`) to prevent floating point errors.
  - Implements canonical Zod schemas (`lib/validation/order.ts`).
  - Manages git branching, integration merges, and end-to-end type safety checks.

#### 2. Agent 1: Frontend (Next.js, Tailwind, shadcn/ui, AG Grid)
- **Files Owned**: `app/(marketing)/**`, `app/dashboard/**`, `app/orders/**`, `app/settings/**`, `components/**`.
- **Responsibilities**:
  - Exporter dashboard with order and payment KPIs.
  - Order intake screen with pasteable Dubai leather wallet buyer enquiry.
  - Extraction review screen showing confidence, missing-field badges, and editable inputs.
  - Seller quotation approval preview.
  - PayPal payment request and buyer approval view.
  - Order activity timeline and AI operations assistant drawer.
  - AG Grid Community table for order management.
  - Enforces dark navy fintech theme with emerald accents.

#### 3. Agent 2: PayPal (Orders v2 Sandbox, Webhooks, Reconciliation)
- **Files Owned**: `lib/paypal/**`, `app/api/paypal/**`.
- **Responsibilities**:
  - OAuth 2.0 token management with automatic expiration handling.
  - Orders v2 create-order API (`intent: 'CAPTURE'`, currency validation, seller-approved minor-unit totals).
  - Server-side capture API on buyer approval.
  - Official PayPal webhook signature verification via PayPal API.
  - Idempotent webhook processing with event deduplication.
  - Multi-factor payment reconciliation (matching order ID, capture ID, amount, and currency).
  - Guardrail: Never trust browser query params (`?paymentId=...`) to mark an order Paid.

#### 4. Agent 3: AI & Database (Supabase Schema, RLS, LLM Adapter)
- **Files Owned**: `supabase/migrations/**`, `lib/db/**`, `lib/ai/**`, `app/api/ai/**`, `lib/seed/**`.
- **Responsibilities**:
  - Supabase PostgreSQL schema with 7 tables, strict check constraints, foreign keys, and RLS policies (`auth.uid() = owner_id`).
  - Robust LLM provider adapter supporting Gemini API free tier, OpenRouter free models, or deterministic fallback.
  - Strict JSON extraction prompt with untrusted data boundary (prevent prompt injection from buyer enquiry).
  - Missing-field detector (flags missing price, shipping, delivery date without inventing data).
  - Quotation explanation generator and order summary generator.
  - Database seed and reset utility for the UAE buyer demo.

#### 5. Agent 4: QA & Submission (Tests, Security Audit, Docs, Demo)
- **Files Owned**: `tests/**`, `docs/**`, contribution to `README.md`.
- **Responsibilities**:
  - Unit tests: money calculations, Zod parsing, prompt validation.
  - Integration tests: PayPal create/capture mock, webhook signature verification, duplicate webhook rejection, currency mismatch rejection.
  - E2E Playwright tests verifying the complete checkout and capture flow.
  - Security audit validating no secrets in client code, no floating point currency, and no unapproved state transitions.
  - Under-three-minute demo script and Devpost submission package.

---

## 7. Security & Hackathon Compliance Guardrails

1. **Monetary Integrity**: Integer minor units (e.g. cents/paise) only. Never use JavaScript floating-point calculations for financial amounts.
2. **Double Approval Gate**:
   - Seller must review and approve quotation before PayPal order is created.
   - Buyer must approve checkout before capture is executed.
   - No autonomous money capture by AI or background processes.
3. **Webhook Verification**:
   - Verify signatures via PayPal's `/v1/notifications/verify-webhook-signature` endpoint.
   - Deduplicate incoming `event_id` against `paypal_webhook_events`.
   - Never mark an order paid based only on client redirect.
4. **Untrusted AI Intake**:
   - Treat incoming buyer text as untrusted data.
   - Never allow LLM to invent missing prices, taxes, or shipping fees.
   - Fall back to manual quotation form if extraction confidence is low.
5. **Secret Protection**:
   - Keep `PAYPAL_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and `LLM_API_KEY` strictly on the server.
   - Provide a zero-credential mock mode so judges or reviewers can run the application offline with identical UX and zero friction.

---

## 8. Immediate Actionable Recommendations for Orchestrator

1. **Step 1: Initialize Git Repository**:
   - Run `git init -b main` in `d:\ExportPilot PayFlow AI`.
   - Create initial `.gitignore`.
   - Stage existing blueprint, guidelines, and survey reports and commit to `main`.
2. **Step 2: Scaffold Application Core (Lead Agent)**:
   - Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"` or scaffold `package.json` with Next.js 14/15, React 19/18, Tailwind, Lucide React, and Zod.
   - Install required dependencies: `@supabase/supabase-js`, `zod`, `ag-grid-react`, `ag-grid-community`, `@paypal/paypal-js` or `@paypal/react-paypal-js`.
   - Create `lib/types.ts`, `lib/money.ts`, and `lib/validation/order.ts`.
3. **Step 3: Branch / Worktree Creation**:
   - Create branches `feature/frontend`, `feature/paypal`, `feature/ai-db`, and `feature/qa-submission`.
4. **Step 4: Dispatch Specialized Agents in Parallel**:
   - Dispatch Agent 1, Agent 2, and Agent 3 to their isolated feature branches/worktrees with their explicit file ownership boundaries.
