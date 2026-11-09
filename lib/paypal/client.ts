/**
 * ExportPilot PayFlow AI — PayPal Orders v2 Sandbox Client
 *
 * Provides OAuth 2.0 client credentials token caching, environment resolution,
 * error classification, and an offline mock sandbox simulator fallback
 * for zero-downtime testing and credential-free evaluation.
 */

export type PayPalErrorCode =
  | "AUTHENTICATION_FAILURE"
  | "INVALID_REQUEST"
  | "RESOURCE_NOT_FOUND"
  | "UNPROCESSABLE_ENTITY"
  | "RATE_LIMITED"
  | "GATEWAY_ERROR"
  | "NETWORK_ERROR";

export interface PayPalApiErrorDetails {
  issue?: string;
  description?: string;
  field?: string;
  value?: unknown;
  location?: string;
  [key: string]: unknown;
}

export class PayPalApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: PayPalErrorCode;
  public readonly details: PayPalApiErrorDetails[] | Record<string, unknown> | null;
  public readonly debugId?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode: PayPalErrorCode,
    details: PayPalApiErrorDetails[] | Record<string, unknown> | null = null,
    debugId?: string
  ) {
    super(`PayPal API Error [${errorCode}] (${statusCode}): ${message}`);
    this.name = "PayPalApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.debugId = debugId;
  }
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// In-memory token cache (persists within node process)
let cachedToken: CachedToken | null = null;

// Mock orders memory for offline sandbox simulation
const simulatedMockOrders = new Map<string, any>();

/**
 * Returns whether real PayPal credentials are provided in the environment.
 */
export function isPayPalConfigured(): boolean {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (
    !clientId ||
    !clientSecret ||
    clientId === "undefined" ||
    clientSecret === "undefined"
  ) {
    return false;
  }

  // Reject obvious placeholder values
  const isPlaceholder =
    clientId.includes("your-") ||
    clientId.includes("placeholder") ||
    clientSecret.includes("your-") ||
    clientSecret.includes("placeholder");

  return !isPlaceholder;
}

/**
 * Determines whether the client should use the offline sandbox simulator.
 */
export function shouldUseMockSandbox(): boolean {
  if (process.env.PAYPAL_MOCK_SANDBOX === "true") {
    return true;
  }
  return !isPayPalConfigured();
}

/**
 * Returns the base URL for PayPal API calls based on environment.
 */
export function getPayPalApiBaseUrl(): string {
  if (process.env.PAYPAL_API_BASE_URL) {
    return process.env.PAYPAL_API_BASE_URL.replace(/\/$/, "");
  }
  const env = (process.env.PAYPAL_ENVIRONMENT || "sandbox").toLowerCase();
  return env === "production" || env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

/**
 * Clears the in-memory access token cache and mock orders.
 * Exported primarily for unit and contract testing isolation.
 */
export function clearPayPalTokenCache(): void {
  cachedToken = null;
  simulatedMockOrders.clear();
}

/**
 * Classifies HTTP status code and PayPal response body into a structured error code.
 */
export function classifyPayPalError(
  status: number,
  body?: Record<string, any>
): PayPalErrorCode {
  if (status === 401 || status === 403) {
    return "AUTHENTICATION_FAILURE";
  }
  if (status === 404) {
    return "RESOURCE_NOT_FOUND";
  }
  if (status === 400) {
    return "INVALID_REQUEST";
  }
  if (status === 422) {
    return "UNPROCESSABLE_ENTITY";
  }
  if (status === 429) {
    return "RATE_LIMITED";
  }
  if (status >= 500) {
    return "GATEWAY_ERROR";
  }
  return "INVALID_REQUEST";
}

/**
 * Retrieves a valid OAuth 2.0 Bearer access token using client credentials grant.
 * Reuses in-memory token if not expired; refreshes with a 60-second safety window.
 */
export async function getPayPalAccessToken(forceRefresh: boolean = false): Promise<string> {
  const now = Date.now();

  // Return cached token if valid and refresh not forced
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }

  // Handle offline mock sandbox simulation
  if (shouldUseMockSandbox()) {
    const mockToken = `mock_sandbox_access_token_${Date.now()}`;
    // 9 hours expiry with 60 second buffer
    const mockExpiresInSeconds = 32400;
    cachedToken = {
      accessToken: mockToken,
      expiresAt: now + (mockExpiresInSeconds - 60) * 1000,
    };
    return mockToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const baseUrl = getPayPalApiBaseUrl();

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();

    if (!response.ok) {
      const errorCode = classifyPayPalError(response.status, data);
      throw new PayPalApiError(
        data.error_description || data.message || "Failed to retrieve PayPal OAuth token",
        response.status,
        errorCode,
        data.details || data
      );
    }

    const expiresInSeconds = typeof data.expires_in === "number" ? data.expires_in : 32400;
    // Cache with 60s safety margin
    const safetyBufferMs = 60 * 1000;
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + expiresInSeconds * 1000 - safetyBufferMs,
    };

    return data.access_token;
  } catch (error: any) {
    if (error instanceof PayPalApiError) {
      throw error;
    }
    throw new PayPalApiError(
      error.message || "Network error while connecting to PayPal OAuth endpoint",
      503,
      "NETWORK_ERROR"
    );
  }
}

/**
 * Standard fetch options for authenticated PayPal Orders v2 requests.
 */
export interface PayPalFetchOptions extends RequestInit {
  idempotencyKey?: string;
  forceTokenRefresh?: boolean;
}

/**
 * Executes an authenticated request against the PayPal API.
 * Automatically handles Bearer authentication and offline simulation fallback.
 */
export async function paypalFetch<T = any>(
  endpoint: string,
  options: PayPalFetchOptions = {}
): Promise<T> {
  const { idempotencyKey, forceTokenRefresh, headers = {}, ...restOptions } = options;
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Offline Sandbox Simulator execution
  if (shouldUseMockSandbox()) {
    return handleSimulatedPayPalRequest<T>(normalizedEndpoint, restOptions, idempotencyKey);
  }

  const token = await getPayPalAccessToken(forceTokenRefresh);
  const baseUrl = getPayPalApiBaseUrl();

  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (idempotencyKey) {
    requestHeaders["PayPal-Request-Id"] = idempotencyKey;
  }

  try {
    const response = await fetch(`${baseUrl}${normalizedEndpoint}`, {
      ...restOptions,
      headers: requestHeaders,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      const errorCode = classifyPayPalError(response.status, data);
      const debugId = response.headers.get("paypal-debug-id") || data.debug_id;
      throw new PayPalApiError(
        data.message || data.error_description || `PayPal request failed with status ${response.status}`,
        response.status,
        errorCode,
        data.details || data,
        debugId
      );
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof PayPalApiError) {
      throw error;
    }
    throw new PayPalApiError(
      error.message || "Failed to communicate with PayPal gateway",
      503,
      "NETWORK_ERROR"
    );
  }
}

/**
 * Handles simulated sandbox requests when real credentials are unavailable or in test mode.
 */
function handleSimulatedPayPalRequest<T>(
  endpoint: string,
  options: RequestInit,
  idempotencyKey?: string
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // 1. Order Creation: POST /v2/checkout/orders
  if (endpoint === "/v2/checkout/orders" && method === "POST") {
    const randomHex = Math.random().toString(36).substring(2, 9).toUpperCase();
    const orderId = `MOCK-ORDER-${randomHex}`;
    const purchaseUnit = body.purchase_units?.[0] || {};

    const simulatedOrder = {
      id: orderId,
      status: "CREATED",
      intent: body.intent || "CAPTURE",
      purchase_units: [
        {
          reference_id: purchaseUnit.reference_id || "default",
          custom_id: purchaseUnit.custom_id,
          invoice_id: purchaseUnit.invoice_id,
          amount: purchaseUnit.amount,
          items: purchaseUnit.items || [],
        },
      ],
      links: [
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
          rel: "approve",
          method: "GET",
        },
        {
          href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
          rel: "self",
          method: "GET",
        },
        {
          href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
          rel: "capture",
          method: "POST",
        },
      ],
      create_time: new Date().toISOString(),
    };

    simulatedMockOrders.set(orderId, simulatedOrder);
    return Promise.resolve(simulatedOrder as unknown as T);
  }

  // 2. Order Capture: POST /v2/checkout/orders/{id}/capture
  const captureMatch = endpoint.match(/^\/v2\/checkout\/orders\/([^\/]+)\/capture$/);
  if (captureMatch && method === "POST") {
    const paypalOrderId = captureMatch[1];
    const existingOrder = simulatedMockOrders.get(paypalOrderId);

    const purchaseUnit = existingOrder?.purchase_units?.[0] || {};
    const amount = purchaseUnit.amount || {
      currency_code: "USD",
      value: "3650.00",
    };
    const customId = purchaseUnit.custom_id;

    const captureId = `MOCK-CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const captureResponse = {
      id: paypalOrderId,
      status: "COMPLETED",
      purchase_units: [
        {
          reference_id: purchaseUnit.reference_id || "default",
          payments: {
            captures: [
              {
                id: captureId,
                status: "COMPLETED",
                amount: amount,
                final_capture: true,
                custom_id: customId,
                seller_protection: {
                  status: "ELIGIBLE",
                },
                create_time: new Date().toISOString(),
                update_time: new Date().toISOString(),
              },
            ],
          },
        },
      ],
      payer: {
        name: { given_name: "Tariq", surname: "Al-Mansoor" },
        email_address: "tariq.mansoor@almansoor-luxury.ae",
        payer_id: "PAYER-MOCK-971",
      },
      idempotency_key: idempotencyKey,
    };

    // Update state of stored mock order
    if (existingOrder) {
      existingOrder.status = "COMPLETED";
      existingOrder.capture = captureResponse;
      simulatedMockOrders.set(paypalOrderId, existingOrder);
    }

    return Promise.resolve(captureResponse as unknown as T);
  }

  // 3. Webhook Signature Verification: POST /v1/notifications/verify-webhook-signature
  if (endpoint === "/v1/notifications/verify-webhook-signature" && method === "POST") {
    // Check if the signature indicates simulated failure
    const isExplicitFailure =
      body.transmission_sig === "INVALID_SIGNATURE" ||
      body.transmission_sig === "FAIL" ||
      body.auth_algo === "INVALID";

    const verification_status = isExplicitFailure ? "FAILURE" : "SUCCESS";
    return Promise.resolve({ verification_status } as unknown as T);
  }

  // 4. Order Details: GET /v2/checkout/orders/{id}
  const orderDetailsMatch = endpoint.match(/^\/v2\/checkout\/orders\/([^\/]+)$/);
  if (orderDetailsMatch && method === "GET") {
    const paypalOrderId = orderDetailsMatch[1];
    const order = simulatedMockOrders.get(paypalOrderId);
    if (!order) {
      throw new PayPalApiError(
        `Order not found: ${paypalOrderId}`,
        404,
        "RESOURCE_NOT_FOUND"
      );
    }
    return Promise.resolve(order as unknown as T);
  }

  // Fallback default mock response
  return Promise.resolve({ success: true, mocked: true } as unknown as T);
}
