## 2026-11-09T12:41:06Z
You are worker_m4_frontend, working in directory:
d:\ExportPilot PayFlow AI\.agents\teamwork\worker_m4_frontend\

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
Implement Milestone 4: Frontend Fintech UI, Quotation, AG Grid & Checkout for ExportPilot PayFlow AI.
Git Branch: Switch to `feature/frontend` (`git checkout feature/frontend`).

Exclusive File Ownership:
- `components/navbar.tsx` & `components/sidebar.tsx`
- `components/orders-grid.tsx`
- `components/quotation-editor.tsx`
- `components/order-timeline.tsx`
- `components/paypal-checkout-button.tsx`
- `components/ai-assistant-widget.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/orders/page.tsx`
- `app/(dashboard)/orders/new/page.tsx`
- `app/(dashboard)/orders/[id]/quote/page.tsx`
- `app/(dashboard)/orders/[id]/pay/page.tsx`
- `app/(dashboard)/assistant/page.tsx`
- `app/page.tsx`

Tasks to Implement:
1. Visual Design & Theme:
   - High-end international fintech SaaS styling with Dark Navy (#0A0F1D, #0F172A, #1E293B) and Emerald accents (#10B981, #059669).
   - Prominent Sandbox warning banners on checkout and payment screens.
2. Layout & Navigation:
   - `components/navbar.tsx`: Header with exporter brand, live currency indicator, sandbox badge, quick links.
   - `components/sidebar.tsx`: Navigation items (Dashboard, Orders, New Enquiry, AI Assistant, Settings).
3. Exporter KPI Dashboard (`app/(dashboard)/dashboard/page.tsx`):
   - Key metric cards: Total Export Volume ($), Active Orders, Pending Quotations, Settled Funds.
   - Recent orders overview and quick actions.
4. Raw Enquiry Intake (`app/(dashboard)/orders/new/page.tsx`):
   - Pastebuyer enquiry multiline textarea.
   - Quick-fill button: "Load UAE Leather Wallets Sample" (loads the authoritative 100-wallet inquiry from Tariq Al-Mansoor).
   - "Extract Order with AI" button: calls `/api/ai/parse-order`, shows real-time extraction card, highlights missing fields.
5. Quotation Review Editor (`components/quotation-editor.tsx` & `app/(dashboard)/orders/[id]/quote/page.tsx`):
   - Exporter reviews extracted items, adjusts unit prices, shipping, Incoterm, and tax rate.
   - Live server total recalculation in integer minor units.
   - Explicit "Approve Quotation" button: transitions order to `quoted` state.
6. PayPal Checkout UI (`components/paypal-checkout-button.tsx` & `app/(dashboard)/orders/[id]/pay/page.tsx`):
   - Shows buyer payment view with quotation summary ($3,650.00 USD for 100 wallets).
   - PayPal Smart Buttons integration: calls `/api/paypal/create-order` on create, calls `/api/paypal/capture-order` on approve.
   - Displays payment receipt, capture ID, and Sandbox verification status.
7. AG Grid Order Management (`components/orders-grid.tsx` & `app/(dashboard)/orders/page.tsx`):
   - AG Grid Community table with sorting, filtering, status badges, and action buttons.
8. Activity Timeline & AI Assistant:
   - `components/order-timeline.tsx`: Chronological visual event timeline.
   - `components/ai-assistant-widget.tsx`: Floating/embedded AI trade assistant chatting via `/api/ai/assistant`.
9. Demo Controls:
   - One-click "Seed Demo Orders" / "Reset to Baseline" button.
10. Build Verification:
   - Run `npm run build` and `npm test` to verify clean compilation.
   - Commit changes to `feature/frontend`: `git add . && git commit -m "feat(frontend): implement dashboard, quotation editor, ag-grid, and paypal checkout ui"`.

Deliverables:
- Write detailed handoff report to:
  `d:\ExportPilot PayFlow AI\.agents\teamwork\worker_m4_frontend\handoff.md`.
- Send completion message to orchestrator.
