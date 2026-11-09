import {
  ExportOrder,
  Buyer,
  Profile,
  AIExtractionResult,
} from "@/types";

/**
 * ExportPilot PayFlow AI — Authoritative Seed Data & Deterministic Offline Samples
 */

// =============================================================================
// Authoritative UAE Buyer Inquiry & Pre-parsed Deterministic Extraction
// =============================================================================

export const AUTHORITATIVE_UAE_ENQUIRY_TEXT =
  `Hello, this is Tariq Al-Mansoor from Al-Mansoor Luxury Goods LLC, Dubai, UAE (email: tariq.mansoor@almansoor-luxury.ae, phone: +971-4-889-1234). We urgently require an export batch of 100 units of your handcrafted genuine leather wallets (Item code: HW-WL-01). Destination port is Dubai International Cargo Terminal (DXB), United Arab Emirates. Please provide your best FOB export price in USD and estimated air freight shipping cost. We need delivery within 30 days.`;

export const AUTHORITATIVE_UAE_EXTRACTION: AIExtractionResult = {
  buyer_name: "Tariq Al-Mansoor",
  buyer_email: "tariq.mansoor@almansoor-luxury.ae",
  buyer_company: "Al-Mansoor Luxury Goods LLC",
  destination_country: "AE",
  currency: "USD",
  items: [
    {
      description: "Handcrafted genuine leather wallets",
      sku: "HW-WL-01",
      quantity: 100,
      unit_price_minor: null, // Left unstated by buyer; requires seller quote
      line_total_minor: null,
      confidence: 0.98,
    },
  ],
  shipping_minor: null, // Left unstated; air freight shipping quote needed
  tax_minor: 0,
  incoterm: "FOB",
  requested_delivery_date: "Within 30 days",
  notes: "Destination port: Dubai International Cargo Terminal (DXB), United Arab Emirates.",
  missing_fields: ["unit_price_minor", "shipping_minor"],
  evidence_snippets: [
    { field: "buyer_name", snippet: "Tariq Al-Mansoor" },
    { field: "buyer_email", snippet: "tariq.mansoor@almansoor-luxury.ae" },
    { field: "buyer_company", snippet: "Al-Mansoor Luxury Goods LLC, Dubai, UAE" },
    { field: "destination_country", snippet: "United Arab Emirates" },
    { field: "quantity", snippet: "100 units" },
    { field: "sku", snippet: "HW-WL-01" },
    { field: "incoterm", snippet: "FOB export price" },
  ],
  confidence_score: 0.96,
  is_fallback: true,
  provider_used: "deterministic_sample_cache",
};

// =============================================================================
// Seed Profiles
// =============================================================================

export const SEED_PROFILE: Profile = {
  id: "00000000-0000-4000-a000-000000000001",
  business_name: "Artisan Leather & Craft Exports",
  contact_email: "export@artisanleather.in",
  country_code: "IN",
  currency_preference: "USD",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

// =============================================================================
// Realistic Buyers Directory
// =============================================================================

export const MOCK_BUYERS: Buyer[] = [
  {
    id: "b1000000-0000-4000-a000-000000000001",
    owner_id: SEED_PROFILE.id,
    name: "Tariq Al-Mansoor",
    email: "tariq.mansoor@almansoor-luxury.ae",
    company_name: "Al-Mansoor Luxury Goods LLC",
    country_code: "AE",
    phone: "+971-4-889-1234",
    address: {
      street: "Suite 402, Al-Rigga Commercial Tower",
      city: "Dubai",
      state: "Dubai",
      country: "United Arab Emirates",
      port_of_entry: "DXB Air Cargo Terminal",
    },
    created_at: "2026-02-01T09:00:00.000Z",
    updated_at: "2026-02-01T09:00:00.000Z",
  },
  {
    id: "b1000000-0000-4000-a000-000000000002",
    owner_id: SEED_PROFILE.id,
    name: "Klaus Schmidt",
    email: "klaus.schmidt@schmidt-weber.de",
    company_name: "Schmidt & Weber GmbH",
    country_code: "DE",
    phone: "+49-69-12345678",
    address: {
      street: "Kaiserstraße 45",
      city: "Frankfurt",
      state: "Hesse",
      country: "Germany",
      port_of_entry: "Hamburg Port",
    },
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "b1000000-0000-4000-a000-000000000003",
    owner_id: SEED_PROFILE.id,
    name: "Kenji Sato",
    email: "kenji.sato@nippon-artisan.jp",
    company_name: "Nippon Artisan Imports Ltd.",
    country_code: "JP",
    phone: "+81-3-5555-0142",
    address: {
      street: "2-4-1 Ginza, Chuo-ku",
      city: "Tokyo",
      state: "Tokyo",
      country: "Japan",
      port_of_entry: "Yokohama Seaport",
    },
    created_at: "2026-02-05T11:00:00.000Z",
    updated_at: "2026-02-05T11:00:00.000Z",
  },
  {
    id: "b1000000-0000-4000-a000-000000000004",
    owner_id: SEED_PROFILE.id,
    name: "Sarah Jenkins",
    email: "s.jenkins@pacific-heritage.com",
    company_name: "Pacific Heritage Goods Co.",
    country_code: "US",
    phone: "+1-503-555-0199",
    address: {
      street: "1200 NW 23rd Avenue",
      city: "Portland",
      state: "OR",
      postal_code: "97210",
      country: "United States",
      port_of_entry: "Seattle Seaport",
    },
    created_at: "2026-02-10T14:30:00.000Z",
    updated_at: "2026-02-10T14:30:00.000Z",
  },
  {
    id: "b1000000-0000-4000-a000-000000000005",
    owner_id: SEED_PROFILE.id,
    name: "Oliver Brooks",
    email: "oliver@london-spicemerchants.co.uk",
    company_name: "London Spice Merchants Ltd.",
    country_code: "GB",
    phone: "+44-20-7946-0912",
    address: {
      street: "88 Borough High Street",
      city: "London",
      postal_code: "SE1 1LL",
      country: "United Kingdom",
      port_of_entry: "Port of Felixstowe",
    },
    created_at: "2026-01-20T08:15:00.000Z",
    updated_at: "2026-01-20T08:15:00.000Z",
  },
];

// =============================================================================
// Realistic Seed Export Orders (5 Orders covering all major lifecycle states)
// =============================================================================

export const MOCK_EXPORT_ORDERS: ExportOrder[] = [
  // 1. Authoritative UAE Leather Wallets Order (Quoted & Ready for PayPal Checkout)
  {
    id: "e1000000-0000-4000-a000-000000000001",
    owner_id: SEED_PROFILE.id,
    buyer_id: MOCK_BUYERS[0].id,
    order_number: "EXP-2026-001",
    source_message: AUTHORITATIVE_UAE_ENQUIRY_TEXT,
    destination_country: "AE",
    currency: "USD",
    subtotal_minor: 350000, // 100 units * $35.00 = $3,500.00
    shipping_minor: 15000, // Air freight $150.00
    tax_minor: 0, // Export tax zero-rated
    total_minor: 365000, // $3,650.00
    status: "quoted",
    incoterm: "FOB",
    ai_extraction: AUTHORITATIVE_UAE_EXTRACTION,
    ai_confidence: 0.96,
    seller_notes: "Approved special export pricing for 100 leather wallets @ $35.00/unit with express air cargo to DXB.",
    seller_approved_at: "2026-02-09T10:15:00.000Z",
    created_at: "2026-02-09T09:30:00.000Z",
    updated_at: "2026-02-09T10:15:00.000Z",
    buyer: MOCK_BUYERS[0],
    items: [
      {
        id: "i1000000-0000-4000-a000-000000000001",
        order_id: "e1000000-0000-4000-a000-000000000001",
        description: "Handcrafted genuine leather wallets (Item code: HW-WL-01)",
        sku: "HW-WL-01",
        quantity: 100,
        unit_price_minor: 3500, // $35.00
        line_total_minor: 350000, // $3,500.00
        created_at: "2026-02-09T09:30:00.000Z",
      },
    ],
    activity_events: [
      {
        id: "a1000000-0000-4000-a000-000000000001",
        order_id: "e1000000-0000-4000-a000-000000000001",
        actor: "buyer",
        event_type: "inquiry_received",
        summary: "Inquiry received from Tariq Al-Mansoor (Al-Mansoor Luxury Goods LLC, Dubai)",
        created_at: "2026-02-09T09:30:00.000Z",
      },
      {
        id: "a1000000-0000-4000-a000-000000000002",
        order_id: "e1000000-0000-4000-a000-000000000001",
        actor: "ai",
        event_type: "order_parsed",
        summary: "AI parsed 100 leather wallets (SKU: HW-WL-01); flagged missing unit price & shipping",
        created_at: "2026-02-09T09:31:00.000Z",
      },
      {
        id: "a1000000-0000-4000-a000-000000000003",
        order_id: "e1000000-0000-4000-a000-000000000001",
        actor: "seller",
        event_type: "quote_approved",
        summary: "Seller approved quotation: $35.00/unit + $150.00 air freight = $3,650.00 total",
        created_at: "2026-02-09T10:15:00.000Z",
      },
    ],
  },

  // 2. Germany Organic Assam Tea Order (Captured & Paid via PayPal)
  {
    id: "e1000000-0000-4000-a000-000000000002",
    owner_id: SEED_PROFILE.id,
    buyer_id: MOCK_BUYERS[1].id,
    order_number: "EXP-2026-002",
    source_message: "Order inquiry for 500 kg Organic Orthodox Assam Black Tea Grade FTGFOP1 to Hamburg Port.",
    destination_country: "DE",
    currency: "USD",
    subtotal_minor: 925000, // 500 * $18.50 = $9,250.00
    shipping_minor: 45000, // Sea freight $450.00
    tax_minor: 0,
    total_minor: 970000, // $9,700.00
    status: "paid",
    incoterm: "CIF",
    ai_extraction: {
      buyer_name: "Klaus Schmidt",
      buyer_email: "klaus.schmidt@schmidt-weber.de",
      buyer_company: "Schmidt & Weber GmbH",
      destination_country: "DE",
      currency: "USD",
      items: [
        {
          description: "Organic Orthodox Assam Black Tea (Grade FTGFOP1)",
          sku: "TEA-ASSAM-01",
          quantity: 500,
          unit_price_minor: 1850,
          line_total_minor: 925000,
          confidence: 0.95,
        },
      ],
      shipping_minor: 45000,
      tax_minor: 0,
      incoterm: "CIF",
      requested_delivery_date: "45 days",
      notes: "Destination Hamburg Port. Vacuum sealed foil packaging.",
      missing_fields: [],
      evidence_snippets: [],
      confidence_score: 0.95,
      is_fallback: false,
    },
    ai_confidence: 0.95,
    seller_notes: "Regular quarterly contract client. Payment received in full.",
    seller_approved_at: "2026-01-16T12:00:00.000Z",
    created_at: "2026-01-16T10:00:00.000Z",
    updated_at: "2026-01-17T15:20:00.000Z",
    buyer: MOCK_BUYERS[1],
    items: [
      {
        id: "i1000000-0000-4000-a000-000000000002",
        order_id: "e1000000-0000-4000-a000-000000000002",
        description: "Organic Orthodox Assam Black Tea (Grade FTGFOP1)",
        sku: "TEA-ASSAM-01",
        quantity: 500,
        unit_price_minor: 1850,
        line_total_minor: 925000,
        created_at: "2026-01-16T10:00:00.000Z",
      },
    ],
    payment: {
      id: "p1000000-0000-4000-a000-000000000002",
      order_id: "e1000000-0000-4000-a000-000000000002",
      paypal_order_id: "5X89234120938471K",
      paypal_capture_id: "7H98234102938472M",
      status: "COMPLETED",
      amount_minor: 970000,
      currency: "USD",
      approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=5X89234120938471K",
      payer_email: "klaus.schmidt@schmidt-weber.de",
      payer_id: "P_DE9823471029",
      created_at: "2026-01-17T15:10:00.000Z",
      captured_at: "2026-01-17T15:20:00.000Z",
      updated_at: "2026-01-17T15:20:00.000Z",
    },
  },

  // 3. Japan Pashmina Silk Shawls (Awaiting Payment)
  {
    id: "e1000000-0000-4000-a000-000000000003",
    owner_id: SEED_PROFILE.id,
    buyer_id: MOCK_BUYERS[2].id,
    order_number: "EXP-2026-003",
    source_message: "We need 50 pieces of handwoven Pashmina Silk Shawls in Natural Indigo Dye shipped to Yokohama.",
    destination_country: "JP",
    currency: "USD",
    subtotal_minor: 325000, // 50 * $65.00 = $3,250.00
    shipping_minor: 18000, // Air express $180.00
    tax_minor: 0,
    total_minor: 343000, // $3,430.00
    status: "awaiting_payment",
    incoterm: "CIP",
    ai_extraction: {
      buyer_name: "Kenji Sato",
      buyer_email: "kenji.sato@nippon-artisan.jp",
      buyer_company: "Nippon Artisan Imports Ltd.",
      destination_country: "JP",
      currency: "USD",
      items: [
        {
          description: "Handwoven Pashmina Silk Shawls (Natural Indigo Dye)",
          sku: "PSH-IND-02",
          quantity: 50,
          unit_price_minor: 6500,
          line_total_minor: 325000,
          confidence: 0.92,
        },
      ],
      shipping_minor: 18000,
      tax_minor: 0,
      incoterm: "CIP",
      requested_delivery_date: "20 days",
      notes: "Custom packaging required with Japanese care labels.",
      missing_fields: [],
      evidence_snippets: [],
      confidence_score: 0.92,
      is_fallback: false,
    },
    ai_confidence: 0.92,
    seller_notes: "PayPal invoice generated, awaiting buyer approval in Tokyo.",
    seller_approved_at: "2026-02-06T10:00:00.000Z",
    created_at: "2026-02-05T12:00:00.000Z",
    updated_at: "2026-02-06T10:05:00.000Z",
    buyer: MOCK_BUYERS[2],
    items: [
      {
        id: "i1000000-0000-4000-a000-000000000003",
        order_id: "e1000000-0000-4000-a000-000000000003",
        description: "Handwoven Pashmina Silk Shawls (Natural Indigo Dye)",
        sku: "PSH-IND-02",
        quantity: 50,
        unit_price_minor: 6500,
        line_total_minor: 325000,
        created_at: "2026-02-05T12:00:00.000Z",
      },
    ],
    payment: {
      id: "p1000000-0000-4000-a000-000000000003",
      order_id: "e1000000-0000-4000-a000-000000000003",
      paypal_order_id: "3P12349081239845X",
      paypal_capture_id: null,
      status: "CREATED",
      amount_minor: 343000,
      currency: "USD",
      approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=3P12349081239845X",
      payer_email: null,
      payer_id: null,
      created_at: "2026-02-06T10:05:00.000Z",
      captured_at: null,
      updated_at: "2026-02-06T10:05:00.000Z",
    },
  },

  // 4. USA Hand-carved Wooden Chess Sets (Draft / Raw Inquiry - Missing Price)
  {
    id: "e1000000-0000-4000-a000-000000000004",
    owner_id: SEED_PROFILE.id,
    buyer_id: MOCK_BUYERS[3].id,
    order_number: "EXP-2026-004",
    source_message: "Hi there, Sarah Jenkins from Pacific Heritage Goods here. We'd like to place an order for 80 hand-carved Sheesham wood chess sets. Could you quote unit price and shipping to Seattle?",
    destination_country: "US",
    currency: "USD",
    subtotal_minor: 0,
    shipping_minor: 0,
    tax_minor: 0,
    total_minor: 0,
    status: "draft",
    incoterm: "FOB",
    ai_extraction: {
      buyer_name: "Sarah Jenkins",
      buyer_email: "s.jenkins@pacific-heritage.com",
      buyer_company: "Pacific Heritage Goods Co.",
      destination_country: "US",
      currency: "USD",
      items: [
        {
          description: "Hand-carved Sheesham wood chess sets",
          sku: "CHESS-SH-04",
          quantity: 80,
          unit_price_minor: null,
          line_total_minor: null,
          confidence: 0.9,
        },
      ],
      shipping_minor: null,
      tax_minor: 0,
      incoterm: "FOB",
      requested_delivery_date: null,
      notes: "Inquiring about unit price and shipping to Seattle.",
      missing_fields: ["unit_price_minor", "shipping_minor"],
      evidence_snippets: [
        { field: "buyer_name", snippet: "Sarah Jenkins" },
        { field: "quantity", snippet: "80 hand-carved Sheesham wood chess sets" },
      ],
      confidence_score: 0.88,
      is_fallback: false,
    },
    ai_confidence: 0.88,
    seller_notes: "Awaiting artisan workshop cost estimate before quoting price.",
    seller_approved_at: null,
    created_at: "2026-02-10T14:30:00.000Z",
    updated_at: "2026-02-10T14:32:00.000Z",
    buyer: MOCK_BUYERS[3],
    items: [
      {
        id: "i1000000-0000-4000-a000-000000000004",
        order_id: "e1000000-0000-4000-a000-000000000004",
        description: "Hand-carved Sheesham wood chess sets",
        sku: "CHESS-SH-04",
        quantity: 80,
        unit_price_minor: 0,
        line_total_minor: 0,
        created_at: "2026-02-10T14:30:00.000Z",
      },
    ],
  },

  // 5. UK Malabar Tellicherry Black Pepper (Completed & Shipped)
  {
    id: "e1000000-0000-4000-a000-000000000005",
    owner_id: SEED_PROFILE.id,
    buyer_id: MOCK_BUYERS[4].id,
    order_number: "EXP-2026-005",
    source_message: "20 bags (50kg each) of Single-Estate Tellicherry Garbled Extra Bold Black Pepper required for London Spice Merchants.",
    destination_country: "GB",
    currency: "USD",
    subtotal_minor: 280000, // 20 * $140.00 = $2,800.00
    shipping_minor: 26000, // Sea freight $260.00
    tax_minor: 0,
    total_minor: 306000, // $3,060.00
    status: "paid",
    incoterm: "CIF",
    ai_extraction: {
      buyer_name: "Oliver Brooks",
      buyer_email: "oliver@london-spicemerchants.co.uk",
      buyer_company: "London Spice Merchants Ltd.",
      destination_country: "GB",
      currency: "USD",
      items: [
        {
          description: "Single-Estate Tellicherry Garbled Extra Bold Black Pepper (50kg bags)",
          sku: "PEP-TG-50",
          quantity: 20,
          unit_price_minor: 14000,
          line_total_minor: 280000,
          confidence: 0.96,
        },
      ],
      shipping_minor: 26000,
      tax_minor: 0,
      incoterm: "CIF",
      requested_delivery_date: "30 days",
      notes: "Delivered to Port of Felixstowe, UK.",
      missing_fields: [],
      evidence_snippets: [],
      confidence_score: 0.96,
      is_fallback: false,
    },
    ai_confidence: 0.96,
    seller_notes: "Phytosanitary certificate and bill of lading attached.",
    seller_approved_at: "2026-01-21T09:00:00.000Z",
    created_at: "2026-01-20T08:15:00.000Z",
    updated_at: "2026-01-22T16:00:00.000Z",
    buyer: MOCK_BUYERS[4],
    items: [
      {
        id: "i1000000-0000-4000-a000-000000000005",
        order_id: "e1000000-0000-4000-a000-000000000005",
        description: "Single-Estate Tellicherry Garbled Extra Bold Black Pepper (50kg bags)",
        sku: "PEP-TG-50",
        quantity: 20,
        unit_price_minor: 14000,
        line_total_minor: 280000,
        created_at: "2026-01-20T08:15:00.000Z",
      },
    ],
    payment: {
      id: "p1000000-0000-4000-a000-000000000005",
      order_id: "e1000000-0000-4000-a000-000000000005",
      paypal_order_id: "9L77881122334455Z",
      paypal_capture_id: "1A99008877665544Y",
      status: "COMPLETED",
      amount_minor: 306000,
      currency: "USD",
      approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=9L77881122334455Z",
      payer_email: "oliver@london-spicemerchants.co.uk",
      payer_id: "P_GB7711223344",
      created_at: "2026-01-22T15:45:00.000Z",
      captured_at: "2026-01-22T16:00:00.000Z",
      updated_at: "2026-01-22T16:00:00.000Z",
    },
  },
];
