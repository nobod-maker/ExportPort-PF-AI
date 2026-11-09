# ExportPilot PayFlow AI — Video Demo Script (2:55 Total Runtime)

**Hackathon**: PayPal AI Hackathon 2026  
**Format**: Under 3-Minute Synchronized Screen & Voiceover Walkthrough  
**Scenario**: UAE Importer Tariq Al-Mansoor purchasing 100 Handmade Leather Wallets (`HW-WL-01`) from an Indian Exporter  
**Target Video Duration**: 2 minutes 55 seconds (0:00 – 2:55)  

---

## 🎬 Act I: The Cross-Border Problem & System Overview (0:00 – 0:25)

| Timestamp | Visual Cue / Screen Action | Voiceover Audio (Spoken Word) |
|---|---|---|
| **0:00 – 0:10** | Camera on ExportPilot PayFlow AI Landing Page (`/`). Dark navy & emerald fintech styling. The title badge reads *"PayPal AI Hackathon 2026 — Official Submission"*. Show the active stats counter: Total Volume, Active Orders, 100% Verified Payments. | *"For millions of small cross-border exporters, international deals don't happen in ERP systems—they happen in unstructured WhatsApp chats and messy email threads. Inquiries arrive with missing prices, unstated delivery terms, and huge payment risks."* |
| **0:10 – 0:25** | Quick cut to the Exporter KPI Dashboard (`/dashboard`). Highlight KPI metric cards: **$84,250 Total Export Volume**, **12 Active Shipments**, **$14,200 Held in Escrow/Pending Capture**. Point cursor to the recent activity timeline. | *"Meet ExportPilot PayFlow AI. We turn messy international buyer inquiries into verified export orders, automate seller-approved quotations, and execute secure cross-border payments with PayPal Orders v2 and 4-way reconciliation."* |

---

## 🤖 Act II: Raw Enquiry Intake & Anti-Hallucination AI Extraction (0:25 – 0:55)

| Timestamp | Visual Cue / Screen Action | Voiceover Audio (Spoken Word) |
|---|---|---|
| **0:25 – 0:38** | Click **New Export Order** in the sidebar (`/orders/new`). Click the **Quick Fill UAE Sample** button. A realistic WhatsApp inquiry pastes instantly into the multiline input: *“Tariq Al-Mansoor here from Al-Mansoor Luxury Goods LLC, Dubai, UAE... Looking to source 100 units of your handmade leather bifold wallets (SKU: HW-WL-01)... Please quote best air cargo rate to DXB airport.”* | *"Here's a typical inquiry from Tariq Al-Mansoor in Dubai requesting 100 handmade leather wallets. Notice there is no unit price, no freight amount, and no Incoterm agreed yet. We click 'Analyze Enquiry with AI'."* |
| **0:38 – 0:55** | Click **Analyze Enquiry with AI**. The button displays a spinning emerald loader: *Extracting with Gemini 1.5 Flash...* In under 1 second, the structured order card appears below. Show the amber alert badge: **Missing Fields: unit_price_minor, shipping_minor**. Show that extracted unit price is `Unspecified (Requires Seller Input)`. | *"Our AI extraction engine parses the buyer, destination country 'AE', and 100 wallets. But crucially—it has anti-hallucination guardrails. It never invents shipping fees, prices, or delivery dates. It explicitly alerts the seller that unit price and freight are missing."* |

---

## 📝 Act III: Exporter Quotation Review & Seller Approval Gate (0:55 – 1:30)

| Timestamp | Visual Cue / Screen Action | Voiceover Audio (Spoken Word) |
|---|---|---|
| **0:55 – 1:12** | Click **Create Draft & Review Quote** (`/orders/EXP-2026-001/quote`). The Quotation Editor opens. Show the line item table. Enter Unit Price: **$35.00**. Enter Air Freight: **$150.00**. Select Incoterm: **FOB (Free On Board)**. Select Port: **DXB Air Cargo Terminal**. | *"As the exporter, we review the draft. We set the unit price to $35.00 per wallet and add $150.00 for express air cargo to Dubai. The system calculates everything in integer minor units—350,000 cents subtotal plus 15,000 cents shipping."* |
| **1:12 – 1:30** | Scroll down to the Grand Total card: **$3,650.00 USD**. Notice the lock icon next to total indicating server-side calculation. Click the emerald button: **Approve & Lock Quotation**. The status badge switches from `draft` to `quoted` with an immutable snapshot. | *"Client totals are never trusted. The backend recalculates the exact grand total of $3,650.00 USD. We click 'Approve & Lock Quotation'. This seller approval gate is mandatory—an unapproved order can never trigger a payment session."* |

---

## 💳 Act IV: PayPal Orders v2 Sandbox Checkout & Server Capture (1:30 – 2:05)

| Timestamp | Visual Cue / Screen Action | Voiceover Audio (Spoken Word) |
|---|---|---|
| **1:30 – 1:45** | Navigate to the Buyer Payment Portal (`/orders/EXP-2026-001/pay`). Prominent banner displays: **SANDBOX TEST MODE: Real payments are not processed**. Show the order summary ($3,650.00 USD). The gold **PayPal** checkout button renders. | *"Now the buyer receives the quotation link. They see the transparent Sandbox indicator and click the official PayPal button. Behind the scenes, our server invokes PayPal Orders v2 API with intent: CAPTURE."* |
| **1:45 – 2:05** | Click the **PayPal** button. The PayPal Sandbox popup modal appears. Buyer Tariq approves the payment of $3,650.00 USD. The modal closes. A spinner appears: *Capturing payment with PayPal server...* In 1.2 seconds, a green checkmark animates with **Payment Successful! Capture ID: CAP-87X912-SANDBOX**. | *"The buyer approves in the PayPal Sandbox modal. Our server immediately captures the order using an idempotent PayPal-Request-Id header to prevent double charges. The payment is captured in seconds!"* |

---

## 🛡️ Act V: Cryptographic Webhook & 4-Way Reconciliation (2:05 – 2:30)

| Timestamp | Visual Cue / Screen Action | Voiceover Audio (Spoken Word) |
|---|---|---|
| **2:05 – 2:18** | Open the **Order Activity Timeline** on the payment receipt page. Highlight the event: `PAYMENT.CAPTURE.COMPLETED`. Show the badge: **Cryptographically Verified by PayPal API**. | *"Next, PayPal's webhook fires. Our backend verifies the cryptographic signature headers with PayPal's verification endpoint and deduplicates against replay attacks using atomic database constraints."* |
| **2:18 – 2:30** | Zoom into the **4-Way Reconciliation Badge**: All 4 green checkmarks: (1) Order ID `EXP-2026-001`, (2) PayPal Order ID `8XY29104`, (3) Amount `365,000 cents` ($3,650.00), (4) Currency `USD`. The status transitions to `paid`. | *"Our strict 4-way reconciliation guardrail compares internal order ID, PayPal order ID, amount in cents, and currency. If even a single penny or currency code differs, the order is halted for manual review. Here, all 4 match perfectly!"* |

---

## 📊 Act VI: AG Grid Management, AI Assistant & Commercial Invoice (2:30 – 2:55)

| Timestamp | Visual Cue / Screen Action | Voiceover Audio (Spoken Word) |
|---|---|---|
| **2:30 – 2:42** | Click **Orders** in sidebar (`/orders`). The enterprise **AG Grid Community v33** table renders with 15 columns: Order #, Buyer, Destination, Status, Items, Minor Units Total, Incoterms, Created Date. Type `"AE"` in the country filter; the grid filters instantly to UAE orders. | *"Back in the exporter dashboard, our AG Grid enterprise table provides instant multi-column filtering, sorting, and pagination across all international accounts."* |
| **2:42 – 2:50** | Click the floating emerald **AI Trade Assistant** widget in the bottom right corner. Type: *"What export documents do I need for Dubai customs?"* The assistant replies with Certificate of Origin, Commercial Invoice with HS Code 4202.31, and Air Waybill. | *"Need compliance advice? Our embedded AI assistant provides instant trade guidance on Incoterms, GCC tariffs, and required export documentation."* |
| **2:50 – 2:55** | Click **Generate Commercial Invoice** button on the order. A clean, printable export-compliant commercial invoice displays on screen with HS codes, buyer address, and PayPal capture receipt. Screen fades with GitHub URL and badges. | *"ExportPilot PayFlow AI: Bringing the security, intelligence, and speed of PayPal Orders v2 to cross-border exporters worldwide. Thank you!"* |

---

## 📋 Production Checklist for Recording

- [x] Resolution: 1920x1080 (1080p, 60fps)
- [x] Browser: Chrome in Fullscreen / Presentation Mode (clean bookmarks bar, zoom 100%)
- [x] Environment: Local development server (`http://localhost:3000`)
- [x] Database: Seeded with realistic export orders via `/api/seed`
- [x] Audio: Clear condenser microphone with pop filter; background music muted or <10% volume
- [x] Total Runtime: 2 minutes 50 seconds (leaves 10s buffer under YouTube / Devpost 3:00 limit)
