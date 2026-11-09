import {
  AIExtractionResult,
  AIProvider,
  Incoterm,
} from "@/types";
import {
  AIExtractionResultSchema,
} from "@/lib/validation/order";
import {
  AUTHORITATIVE_UAE_EXTRACTION,
  AUTHORITATIVE_UAE_ENQUIRY_TEXT,
} from "@/lib/mock-data";
import {
  SYSTEM_EXTRACTION_PROMPT,
  buildExtractionUserPrompt,
  SYSTEM_ASSISTANT_PROMPT,
  buildAssistantUserPrompt,
} from "@/lib/ai/prompts";

const REQUEST_TIMEOUT_MS = 8000;

export interface ExtractionExecutionResult {
  data: AIExtractionResult;
  provider_used: string;
  is_fallback: boolean;
  latency_ms: number;
}

export interface AssistantExecutionResult {
  reply: string;
  provider_used: string;
  is_fallback: boolean;
  latency_ms: number;
  suggestions?: string[];
}

/**
 * Normalizes and strips JSON markdown code fences if present in model output.
 */
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/i, "");
  }
  return cleaned.trim();
}

/**
 * Zero-hallucination post-processor:
 * Inspects extracted output against the raw text to ensure prices, shipping,
 * or taxes were not fabricated if unstated.
 */
function applyZeroHallucinationGuardrails(
  extracted: AIExtractionResult,
  rawText: string
): AIExtractionResult {
  const result: AIExtractionResult = { ...extracted };
  const lowerText = rawText.toLowerCase();

  // If items lack prices or text does not explicitly state unit price with currency symbol,
  // enforce unit_price_minor = null and missing_fields entry.
  const hasExplicitPriceMention =
    /\$\s*\d+|\d+\s*(usd|dollars?|aed|eur|cents?)|unit\s*price\s*[:=]\s*\d+/i.test(rawText);

  result.items = result.items.map((item) => {
    let unitPrice = item.unit_price_minor;
    let lineTotal = item.line_total_minor;

    if (!hasExplicitPriceMention && unitPrice !== null) {
      unitPrice = null;
      lineTotal = null;
    }

    return {
      ...item,
      unit_price_minor: unitPrice,
      line_total_minor: lineTotal,
    };
  });

  const hasExplicitShippingMention =
    /shipping\s*(is|cost|fee|amount)?\s*[:=]?\s*\$?\d+/i.test(lowerText) &&
    !/please\s*provide|estimate|what\s*is/i.test(lowerText);

  if (!hasExplicitShippingMention) {
    result.shipping_minor = null;
  }

  // Ensure missing_fields reflects all required unquoted attributes
  const missingSet = new Set(result.missing_fields || []);

  const anyItemMissingPrice = result.items.some((i) => i.unit_price_minor === null);
  if (anyItemMissingPrice) {
    missingSet.add("unit_price_minor");
  }
  if (result.shipping_minor === null) {
    missingSet.add("shipping_minor");
  }
  if (!result.buyer_email) {
    missingSet.add("buyer_email");
  }
  if (!result.incoterm) {
    missingSet.add("incoterm");
  }

  result.missing_fields = Array.from(missingSet);
  return result;
}

/**
 * Deterministic offline extractor for fallback scenarios (missing keys, offline, HTTP 429 quota exhaustion).
 */
export function extractDeterministicFallback(rawText: string): AIExtractionResult {
  const lower = rawText.toLowerCase();

  // If text closely matches or mentions the authoritative UAE leather wallet inquiry:
  const isUaeInquiry =
    lower.includes("tariq") ||
    lower.includes("al-mansoor") ||
    lower.includes("leather wallet") ||
    lower.includes("hw-wl-01") ||
    lower.includes("dubai");

  if (isUaeInquiry) {
    return {
      ...AUTHORITATIVE_UAE_EXTRACTION,
      is_fallback: true,
      provider_used: "deterministic_sample_cache",
    };
  }

  // Deterministic rule-based extraction for general inquiries:
  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  const buyerEmail = emailMatch ? emailMatch[0] : null;

  // Extract quantity and product
  const qtyMatch = rawText.match(
    /(\d+)\s*(?:units?|pcs?|pieces?|items?|pairs?|boxes?|cartons?|sets?)?\s*(?:of)?\s*([a-zA-Z0-9\s-]+?)(?=[.,;\n]|$)/i
  );
  let quantity = 100;
  let description = "Export merchandise";

  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
    const desc = qtyMatch[2].trim();
    if (desc) {
      description = desc;
    }
  } else {
    const fallbackNumMatch = rawText.match(/\b(\d+)\b/);
    if (fallbackNumMatch) {
      quantity = parseInt(fallbackNumMatch[1], 10);
    }
  }

  // Country inference
  let destinationCountry: string | null = null;
  if (/uae|dubai|abu\s*dhabi|emirates/i.test(lower)) destinationCountry = "AE";
  else if (/germany|deutschland|frankfurt|berlin|hamburg/i.test(lower)) destinationCountry = "DE";
  else if (/usa|united\s*states|america|portland|seattle|new\s*york/i.test(lower)) destinationCountry = "US";
  else if (/japan|tokyo|yokohama|osaka/i.test(lower)) destinationCountry = "JP";
  else if (/uk|united\s*kingdom|london/i.test(lower)) destinationCountry = "GB";

  // Incoterm inference
  let incoterm: Incoterm | null = null;
  const incotermMatch = rawText.match(/\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\b/i);
  if (incotermMatch) {
    incoterm = incotermMatch[1].toUpperCase() as Incoterm;
  }

  // Currency inference
  let currency: string = "USD";
  if (/\beur\b|euro/i.test(lower)) currency = "EUR";
  else if (/\baed\b|dirham/i.test(lower)) currency = "AED";
  else if (/\bjpy\b|yen/i.test(lower)) currency = "JPY";

  const missingFields: string[] = ["unit_price_minor", "shipping_minor"];
  if (!buyerEmail) missingFields.push("buyer_email");
  if (!incoterm) missingFields.push("incoterm");

  const evidenceSnippets = [];
  if (qtyMatch) evidenceSnippets.push({ field: "quantity", snippet: qtyMatch[0] });
  if (destinationCountry) evidenceSnippets.push({ field: "destination_country", snippet: destinationCountry });
  if (buyerEmail) evidenceSnippets.push({ field: "buyer_email", snippet: buyerEmail });

  return {
    buyer_name: null,
    buyer_email: buyerEmail,
    buyer_company: null,
    destination_country: destinationCountry,
    currency,
    items: [
      {
        description,
        sku: null,
        quantity: Math.max(1, quantity),
        unit_price_minor: null, // Strictly null - buyer hasn't provided
        line_total_minor: null,
        confidence: 0.9,
      },
    ],
    shipping_minor: null,
    tax_minor: 0,
    incoterm,
    requested_delivery_date: null,
    notes: "Extracted via deterministic fallback parser.",
    missing_fields: missingFields,
    evidence_snippets: evidenceSnippets,
    confidence_score: 0.85,
    is_fallback: true,
    provider_used: "deterministic_fallback",
  };
}

/**
 * Calls Google Gemini API (gemini-1.5-flash) free tier.
 */
async function callGeminiApi(prompt: string, systemInstruction: string): Promise<string> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Gemini returned empty candidate content.");
    }
    return candidateText;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Calls OpenRouter free models API.
 */
async function callOpenRouterApi(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free";

  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://exportpilot-payflow.vercel.app",
        "X-Title": "ExportPilot PayFlow AI",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json();
    const messageContent = data?.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error("OpenRouter returned empty response content.");
    }
    return messageContent;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Primary Multi-Provider AI Order Extraction Engine:
 * Coordinates Gemini, OpenRouter, and Deterministic Fallback with strict Zod validation.
 */
export async function extractOrderFromText(
  rawText: string,
  preferredProvider: AIProvider = "auto"
): Promise<ExtractionExecutionResult> {
  const startTime = Date.now();

  // If fallback is explicitly requested, bypass network immediately
  if (preferredProvider === "fallback") {
    const fallbackData = extractDeterministicFallback(rawText);
    return {
      data: fallbackData,
      provider_used: "deterministic_fallback",
      is_fallback: true,
      latency_ms: Date.now() - startTime,
    };
  }

  const userPrompt = buildExtractionUserPrompt(rawText);
  let rawJsonText: string | null = null;
  let providerUsed = "unknown";
  let lastError: Error | null = null;

  // Provider resolution sequence:
  const providersToTry: Array<"gemini" | "openrouter"> = [];
  if (preferredProvider === "gemini") {
    providersToTry.push("gemini");
  } else if (preferredProvider === "openrouter") {
    providersToTry.push("openrouter");
  } else {
    // "auto" sequence: check which keys are set
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      providersToTry.push("gemini");
    }
    if (process.env.OPENROUTER_API_KEY) {
      providersToTry.push("openrouter");
    }
  }

  for (const prov of providersToTry) {
    try {
      if (prov === "gemini") {
        rawJsonText = await callGeminiApi(userPrompt, SYSTEM_EXTRACTION_PROMPT);
        providerUsed = "gemini";
        break;
      } else if (prov === "openrouter") {
        rawJsonText = await callOpenRouterApi(userPrompt, SYSTEM_EXTRACTION_PROMPT);
        providerUsed = "openrouter";
        break;
      }
    } catch (err: any) {
      lastError = err;
      // Continue to next provider or fallback
    }
  }

  // If live LLM call succeeded, parse and validate JSON
  if (rawJsonText) {
    try {
      const parsed = JSON.parse(cleanJsonOutput(rawJsonText));
      const validated = AIExtractionResultSchema.safeParse({
        ...parsed,
        is_fallback: false,
        provider_used: providerUsed,
      });

      if (validated.success) {
        const guardedData = applyZeroHallucinationGuardrails(validated.data, rawText);
        return {
          data: guardedData,
          provider_used: providerUsed,
          is_fallback: false,
          latency_ms: Date.now() - startTime,
        };
      }
    } catch (parseErr) {
      // JSON parse or schema failure: trigger safe fallback
    }
  }

  // Graceful deterministic fallback
  const fallbackData = extractDeterministicFallback(rawText);
  const guardedFallback = applyZeroHallucinationGuardrails(fallbackData, rawText);

  return {
    data: guardedFallback,
    provider_used: "deterministic_sample_cache",
    is_fallback: true,
    latency_ms: Date.now() - startTime,
  };
}

/**
 * AI Business Assistant Handler:
 * Provides export trade, Incoterms, and payment security advisory.
 */
export async function generateAssistantAdvice(
  userQuery: string,
  orderContext?: any,
  preferredProvider: AIProvider = "auto"
): Promise<AssistantExecutionResult> {
  const startTime = Date.now();
  const userPrompt = buildAssistantUserPrompt(userQuery, orderContext);

  if (preferredProvider !== "fallback") {
    // Try Gemini if available
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      try {
        const reply = await callGeminiApi(userPrompt, SYSTEM_ASSISTANT_PROMPT);
        return {
          reply: reply.trim(),
          provider_used: "gemini",
          is_fallback: false,
          latency_ms: Date.now() - startTime,
          suggestions: [
            "What is the difference between FOB and CIF?",
            "How does PayPal Orders v2 protect export shipments?",
            "Should I request an advance deposit before production?",
          ],
        };
      } catch {
        // Fall through to OpenRouter or fallback
      }
    }

    // Try OpenRouter if available
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const reply = await callOpenRouterApi(userPrompt, SYSTEM_ASSISTANT_PROMPT);
        return {
          reply: reply.trim(),
          provider_used: "openrouter",
          is_fallback: false,
          latency_ms: Date.now() - startTime,
          suggestions: [
            "What is the difference between FOB and CIF?",
            "How does PayPal Orders v2 protect export shipments?",
            "Should I request an advance deposit before production?",
          ],
        };
      } catch {
        // Fall through to fallback
      }
    }
  }

  // Deterministic trade assistant advice fallback
  let advice = `**ExportPilot Trade Advisory:**\n\n`;
  const lower = userQuery.toLowerCase();

  if (lower.includes("fob") || lower.includes("cif") || lower.includes("incoterm")) {
    advice += `Under **FOB (Free on Board)**, your risk as the exporter transfers once goods are loaded on board the vessel/aircraft at the origin terminal. The buyer pays international freight and insurance.\n\n` +
      `Under **CIF (Cost, Insurance & Freight)**, you are responsible for ocean/air freight and marine insurance up to the destination port, but risk transfers once goods pass the origin ship's rail.\n\n` +
      `**Recommendation**: For air cargo to Dubai (DXB), FOB or FCA is optimal for small exporters to avoid variable destination surcharges.`;
  } else if (lower.includes("paypal") || lower.includes("payment") || lower.includes("escrow") || lower.includes("capture")) {
    advice += `**PayPal Orders v2 Security Practice:**\n\n` +
      `1. Never ship goods based solely on a browser redirect. Always await server-side \`COMPLETED\` capture verification.\n` +
      `2. Verify the 4-way reconciliation guardrail: Order ID, Capture ID, currency, and total minor cents must match your internal database exactly.\n` +
      `3. Keep tracking numbers and air waybills (AWB) linked to the PayPal capture transaction for Seller Protection eligibility.`;
  } else if (lower.includes("margin") || lower.includes("price") || lower.includes("quote") || lower.includes("pricing")) {
    advice += `**Export Quotation Calculation Strategy:**\n\n` +
      `- **Ex-Factory Base**: Direct materials + labour + standard production overhead.\n` +
      `- **Export Packaging & Handling**: Palletizing, export-grade moisture protection, barcode labelling (+3-5%).\n` +
      `- **Payment Gateway Allowance**: Factor in standard PayPal cross-border fees (3.49% + fixed fee).\n` +
      `- **Target Net Margin**: Aim for 22-28% net margin on finished leather export goods.`;
  } else {
    advice += `Regarding your export inquiry: When quoting international buyers in UAE and GCC markets:\n\n` +
      `1. Specify **currency** (USD) and exact **Incoterm 2020**.\n` +
      `2. Ensure delivery lead time includes export customs inspection (typically 3-5 days in India before port loading).\n` +
      `3. Require full payment capture via PayPal Sandbox before dispatching high-value artisan batches.`;
  }

  return {
    reply: advice,
    provider_used: "deterministic_advisory_engine",
    is_fallback: true,
    latency_ms: Date.now() - startTime,
    suggestions: [
      "Explain FOB vs CIF for UAE export",
      "How to set up PayPal Seller Protection for exports",
      "Calculate export margin for 100 leather wallets",
    ],
  };
}
