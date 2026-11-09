import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  ExportOrder,
  OrderItem,
  Buyer,
  Profile,
  PayPalPayment,
  PayPalWebhookEvent,
  ActivityEvent,
  OrderStatus,
  PaymentStatus,
  ActivityActor,
} from "@/types";
import {
  SEED_PROFILE,
  MOCK_BUYERS,
  MOCK_EXPORT_ORDERS,
} from "@/lib/mock-data";

/**
 * Checks whether Supabase server-side credentials are configured.
 */
export function isSupabaseServerConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes("placeholder") || url.includes("example.com")) return false;
  return true;
}

// =============================================================================
// In-Memory Repository for Local Development, Testing, and Demos
// =============================================================================

class InMemoryDatabaseRepository {
  private profiles = new Map<string, Profile>();
  private buyers = new Map<string, Buyer>();
  private exportOrders = new Map<string, ExportOrder>();
  private orderItems = new Map<string, OrderItem>();
  private paypalPayments = new Map<string, PayPalPayment>();
  private paypalWebhookEvents = new Map<string, PayPalWebhookEvent>();
  private activityEvents = new Map<string, ActivityEvent>();

  constructor() {
    this.resetToSeeds();
  }

  public resetToSeeds() {
    this.profiles.clear();
    this.buyers.clear();
    this.exportOrders.clear();
    this.orderItems.clear();
    this.paypalPayments.clear();
    this.paypalWebhookEvents.clear();
    this.activityEvents.clear();

    // 1. Seed Profile
    this.profiles.set(SEED_PROFILE.id, { ...SEED_PROFILE });

    // 2. Seed Buyers
    for (const buyer of MOCK_BUYERS) {
      this.buyers.set(buyer.id, JSON.parse(JSON.stringify(buyer)));
    }

    // 3. Seed Orders, Items, Payments, Activity Events
    for (const order of MOCK_EXPORT_ORDERS) {
      const clonedOrder = JSON.parse(JSON.stringify(order));
      this.exportOrders.set(order.id, clonedOrder);

      if (order.items) {
        for (const item of order.items) {
          this.orderItems.set(item.id, JSON.parse(JSON.stringify(item)));
        }
      }

      if (order.payment) {
        this.paypalPayments.set(order.payment.id, JSON.parse(JSON.stringify(order.payment)));
      }

      if (order.activity_events) {
        for (const event of order.activity_events) {
          this.activityEvents.set(event.id, JSON.parse(JSON.stringify(event)));
        }
      }
    }
  }

  // --- Profile Methods ---
  public getProfile(id: string = SEED_PROFILE.id): Profile | undefined {
    return this.profiles.get(id);
  }

  // --- Buyer Methods ---
  public getBuyers(): Buyer[] {
    return Array.from(this.buyers.values());
  }

  public getBuyerById(id: string): Buyer | undefined {
    return this.buyers.get(id);
  }

  public createBuyer(buyer: Omit<Buyer, "id" | "created_at" | "updated_at"> & { id?: string }): Buyer {
    const id = buyer.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const newBuyer: Buyer = {
      ...buyer,
      id,
      created_at: now,
      updated_at: now,
    };
    this.buyers.set(id, newBuyer);
    return newBuyer;
  }

  // --- Export Order Methods ---
  public getOrders(): ExportOrder[] {
    return Array.from(this.exportOrders.values()).map((order) => this.hydrateOrder(order));
  }

  public getOrderById(id: string): ExportOrder | undefined {
    const order = this.exportOrders.get(id);
    if (!order) return undefined;
    return this.hydrateOrder(order);
  }

  public getOrderByNumber(orderNumber: string): ExportOrder | undefined {
    for (const order of this.exportOrders.values()) {
      if (order.order_number === orderNumber) {
        return this.hydrateOrder(order);
      }
    }
    return undefined;
  }

  public createOrder(
    orderData: Omit<ExportOrder, "id" | "created_at" | "updated_at" | "items" | "payment" | "activity_events"> & {
      id?: string;
    },
    itemsData: Array<Omit<OrderItem, "id" | "order_id" | "created_at"> & { id?: string }> = []
  ): ExportOrder {
    const orderId = orderData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const createdItems: OrderItem[] = itemsData.map((item) => {
      const itemId = item.id || crypto.randomUUID();
      const lineTotal = item.line_total_minor ?? item.quantity * item.unit_price_minor;
      const orderItem: OrderItem = {
        ...item,
        id: itemId,
        order_id: orderId,
        line_total_minor: lineTotal,
        created_at: now,
      };
      this.orderItems.set(itemId, orderItem);
      return orderItem;
    });

    const newOrder: ExportOrder = {
      ...orderData,
      id: orderId,
      created_at: now,
      updated_at: now,
      items: createdItems,
    };

    this.exportOrders.set(orderId, newOrder);

    // Record creation activity
    this.recordActivity(
      orderId,
      "system",
      "order_created",
      `Export order #${newOrder.order_number} draft initialized.`,
      { order_number: newOrder.order_number }
    );

    return this.hydrateOrder(newOrder);
  }

  public updateOrder(id: string, updates: Partial<ExportOrder>): ExportOrder | undefined {
    const order = this.exportOrders.get(id);
    if (!order) return undefined;

    const updated: ExportOrder = {
      ...order,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.exportOrders.set(id, updated);
    return this.hydrateOrder(updated);
  }

  public updateOrderStatus(id: string, status: OrderStatus, reason?: string): ExportOrder | undefined {
    const order = this.exportOrders.get(id);
    if (!order) return undefined;

    const previousStatus = order.status;
    order.status = status;
    order.updated_at = new Date().toISOString();

    this.exportOrders.set(id, order);

    this.recordActivity(
      id,
      "system",
      "status_changed",
      `Order status transitioned from ${previousStatus} to ${status}${reason ? `: ${reason}` : "."}`,
      { from: previousStatus, to: status, reason }
    );

    return this.hydrateOrder(order);
  }

  // --- Order Items Methods ---
  public getOrderItems(orderId: string): OrderItem[] {
    const items: OrderItem[] = [];
    for (const item of this.orderItems.values()) {
      if (item.order_id === orderId) {
        items.push(item);
      }
    }
    return items;
  }

  public replaceOrderItems(
    orderId: string,
    itemsData: Array<Omit<OrderItem, "id" | "order_id" | "created_at"> & { id?: string }>
  ): OrderItem[] {
    // Delete existing items for order
    for (const [key, item] of this.orderItems.entries()) {
      if (item.order_id === orderId) {
        this.orderItems.delete(key);
      }
    }

    const now = new Date().toISOString();
    const newItems: OrderItem[] = itemsData.map((item) => {
      const id = item.id || crypto.randomUUID();
      const lineTotal = item.line_total_minor ?? item.quantity * item.unit_price_minor;
      const orderItem: OrderItem = {
        ...item,
        id,
        order_id: orderId,
        line_total_minor: lineTotal,
        created_at: now,
      };
      this.orderItems.set(id, orderItem);
      return orderItem;
    });

    return newItems;
  }

  // --- PayPal Payment Methods ---
  public getPaymentByOrderId(orderId: string): PayPalPayment | undefined {
    for (const payment of this.paypalPayments.values()) {
      if (payment.order_id === orderId) {
        return payment;
      }
    }
    return undefined;
  }

  public getPaymentByPayPalOrderId(paypalOrderId: string): PayPalPayment | undefined {
    for (const payment of this.paypalPayments.values()) {
      if (payment.paypal_order_id === paypalOrderId) {
        return payment;
      }
    }
    return undefined;
  }

  public savePayment(paymentData: Omit<PayPalPayment, "id" | "created_at" | "updated_at"> & { id?: string }): PayPalPayment {
    const id = paymentData.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const payment: PayPalPayment = {
      ...paymentData,
      id,
      created_at: now,
      updated_at: now,
    };
    this.paypalPayments.set(id, payment);

    this.recordActivity(
      payment.order_id,
      "paypal",
      "payment_initialized",
      `PayPal checkout order ${payment.paypal_order_id} created with status ${payment.status}.`,
      { paypal_order_id: payment.paypal_order_id, amount_minor: payment.amount_minor, currency: payment.currency }
    );

    return payment;
  }

  public updatePayment(
    id: string,
    updates: Partial<PayPalPayment>
  ): PayPalPayment | undefined {
    const payment = this.paypalPayments.get(id);
    if (!payment) return undefined;

    const updated: PayPalPayment = {
      ...payment,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.paypalPayments.set(id, updated);
    return updated;
  }

  // --- Webhook Events Methods (Deduplication) ---
  public isWebhookEventProcessed(eventId: string): boolean {
    return this.paypalWebhookEvents.has(eventId);
  }

  public recordWebhookEvent(
    eventData: Omit<PayPalWebhookEvent, "id" | "received_at"> & { id?: string }
  ): { event: PayPalWebhookEvent; isDuplicate: boolean } {
    if (this.paypalWebhookEvents.has(eventData.paypal_event_id)) {
      return {
        event: this.paypalWebhookEvents.get(eventData.paypal_event_id)!,
        isDuplicate: true,
      };
    }

    const id = eventData.id || crypto.randomUUID();
    const newEvent: PayPalWebhookEvent = {
      ...eventData,
      id,
      received_at: new Date().toISOString(),
    };

    this.paypalWebhookEvents.set(eventData.paypal_event_id, newEvent);
    return { event: newEvent, isDuplicate: false };
  }

  // --- Activity Event Methods ---
  public recordActivity(
    orderId: string,
    actor: ActivityActor,
    eventType: string,
    summary: string,
    metadata: Record<string, unknown> = {}
  ): ActivityEvent {
    const id = crypto.randomUUID();
    const event: ActivityEvent = {
      id,
      order_id: orderId,
      actor,
      event_type: eventType,
      summary,
      metadata,
      created_at: new Date().toISOString(),
    };
    this.activityEvents.set(id, event);
    return event;
  }

  public getActivityEvents(orderId: string): ActivityEvent[] {
    const events: ActivityEvent[] = [];
    for (const event of this.activityEvents.values()) {
      if (event.order_id === orderId) {
        events.push(event);
      }
    }
    return events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // --- Internal Hydration Helper ---
  private hydrateOrder(order: ExportOrder): ExportOrder {
    const items = this.getOrderItems(order.id);
    const buyer = order.buyer_id ? this.getBuyerById(order.buyer_id) || null : null;
    const payment = this.getPaymentByOrderId(order.id) || null;
    const activity_events = this.getActivityEvents(order.id);

    return {
      ...order,
      buyer,
      items,
      payment,
      activity_events,
    };
  }

  // --- Generic Supabase-like Query Builder Adapter ---
  public getTableRecords(table: string): any[] {
    switch (table) {
      case "profiles":
        return Array.from(this.profiles.values());
      case "buyers":
        return Array.from(this.buyers.values());
      case "export_orders":
        return this.getOrders();
      case "order_items":
        return Array.from(this.orderItems.values());
      case "paypal_payments":
        return Array.from(this.paypalPayments.values());
      case "paypal_webhook_events":
        return Array.from(this.paypalWebhookEvents.values());
      case "activity_events":
        return Array.from(this.activityEvents.values());
      default:
        return [];
    }
  }
}

// Global singleton in-memory database instance
export const inMemoryDb = new InMemoryDatabaseRepository();

/**
 * Creates a mock Supabase server query client wrapped around inMemoryDb.
 */
function createMockServerClient(): any {
  return {
    isMock: true,
    inMemoryDb,
    from(tableName: string) {
      let records: any[] = inMemoryDb.getTableRecords(tableName);
      let filters: Array<(item: any) => boolean> = [];
      let sortFn: ((a: any, b: any) => number) | null = null;
      let limitCount: number | null = null;

      const builder = {
        select(fields: string = "*") {
          return builder;
        },
        eq(field: string, value: any) {
          filters.push((item: any) => item[field] === value);
          return builder;
        },
        neq(field: string, value: any) {
          filters.push((item: any) => item[field] !== value);
          return builder;
        },
        order(field: string, { ascending = true }: { ascending?: boolean } = {}) {
          sortFn = (a: any, b: any) => {
            const valA = a[field];
            const valB = b[field];
            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
          };
          return builder;
        },
        limit(count: number) {
          limitCount = count;
          return builder;
        },
        async single() {
          const res = await builder.then();
          if (res.error) return { data: null, error: res.error };
          if (!res.data || res.data.length === 0) {
            return { data: null, error: { message: "Row not found", code: "PGRST116" } };
          }
          return { data: res.data[0], error: null };
        },
        async maybeSingle() {
          const res = await builder.then();
          if (res.error) return { data: null, error: res.error };
          return { data: res.data && res.data.length > 0 ? res.data[0] : null, error: null };
        },
        async insert(values: any | any[]) {
          const items = Array.isArray(values) ? values : [values];
          const inserted: any[] = [];

          for (const item of items) {
            if (tableName === "export_orders") {
              const ord = inMemoryDb.createOrder(item, item.items || []);
              inserted.push(ord);
            } else if (tableName === "paypal_payments") {
              const pay = inMemoryDb.savePayment(item);
              inserted.push(pay);
            } else if (tableName === "paypal_webhook_events") {
              const res = inMemoryDb.recordWebhookEvent(item);
              if (res.isDuplicate) {
                return { data: null, error: { message: "Duplicate event", code: "23505" } };
              }
              inserted.push(res.event);
            } else if (tableName === "activity_events") {
              const act = inMemoryDb.recordActivity(
                item.order_id,
                item.actor,
                item.event_type,
                item.summary,
                item.metadata
              );
              inserted.push(act);
            } else if (tableName === "buyers") {
              const b = inMemoryDb.createBuyer(item);
              inserted.push(b);
            } else {
              inserted.push({ ...item, id: item.id || crypto.randomUUID() });
            }
          }

          return {
            data: Array.isArray(values) ? inserted : inserted[0],
            error: null,
            select() {
              return {
                async single() {
                  return { data: inserted[0], error: null };
                },
              };
            },
          };
        },
        async update(updates: any) {
          return {
            eq(field: string, value: any) {
              if (tableName === "export_orders" && field === "id") {
                const updated = inMemoryDb.updateOrder(value, updates);
                return {
                  data: updated ? [updated] : [],
                  error: null,
                  select() {
                    return {
                      async single() {
                        return { data: updated || null, error: updated ? null : { message: "Not found" } };
                      },
                    };
                  },
                };
              }

              if (tableName === "paypal_payments" && field === "id") {
                const updated = inMemoryDb.updatePayment(value, updates);
                return {
                  data: updated ? [updated] : [],
                  error: null,
                  select() {
                    return {
                      async single() {
                        return { data: updated || null, error: updated ? null : { message: "Not found" } };
                      },
                    };
                  },
                };
              }

              return {
                data: [],
                error: null,
                select() {
                  return {
                    async single() {
                      return { data: null, error: { message: "Update completed" } };
                    },
                  };
                },
              };
            },
          };
        },
        async delete() {
          return {
            eq(field: string, value: any) {
              return { data: null, error: null };
            },
          };
        },
        then(resolve?: (value: any) => any, reject?: (reason: any) => any) {
          let result = inMemoryDb.getTableRecords(tableName);
          for (const fn of filters) {
            result = result.filter(fn);
          }
          if (sortFn) {
            result.sort(sortFn);
          }
          if (limitCount !== null) {
            result = result.slice(0, limitCount);
          }
          const response = { data: result, error: null };
          return resolve ? Promise.resolve(resolve(response)) : Promise.resolve(response);
        },
      };

      return builder;
    },
  };
}

let serverClientInstance: SupabaseClient | any = null;

/**
 * Creates and caches the Supabase server client.
 * Falls back seamlessly to in-memory simulation when environment variables are not set.
 */
export function createServerClient(): SupabaseClient | any {
  if (serverClientInstance) {
    return serverClientInstance;
  }

  if (isSupabaseServerConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    serverClientInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } else {
    serverClientInstance = createMockServerClient();
  }

  return serverClientInstance;
}

export const createAdminClient = createServerClient;
export const getSupabaseAdminClient = createServerClient;
