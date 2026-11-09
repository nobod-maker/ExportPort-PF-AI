import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  MOCK_BUYERS,
  MOCK_EXPORT_ORDERS,
  SEED_PROFILE,
} from "@/lib/mock-data";

/**
 * Checks whether Supabase is configured with valid credentials in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (url.includes("placeholder") || url.includes("example.com")) return false;
  return true;
}

/**
 * In-memory mock client simulation for local development and demos
 * when live Supabase credentials are not provided.
 */
function createMockBrowserClient(): any {
  // Local state seeded from mock data
  const state = {
    profiles: [{ ...SEED_PROFILE }],
    buyers: MOCK_BUYERS.map((b) => ({ ...b })),
    export_orders: MOCK_EXPORT_ORDERS.map((o) => ({ ...o })),
    order_items: MOCK_EXPORT_ORDERS.flatMap((o) => o.items || []),
    paypal_payments: MOCK_EXPORT_ORDERS.flatMap((o) => (o.payment ? [o.payment] : [])),
    activity_events: MOCK_EXPORT_ORDERS.flatMap((o) => o.activity_events || []),
    paypal_webhook_events: [] as any[],
  };

  return {
    isMock: true,
    auth: {
      async getUser() {
        return { data: { user: { id: SEED_PROFILE.id, email: SEED_PROFILE.contact_email } }, error: null };
      },
      async getSession() {
        return { data: { session: { user: { id: SEED_PROFILE.id } } }, error: null };
      },
    },
    from(tableName: keyof typeof state | string) {
      const records: any[] = (state as any)[tableName] || [];
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
          const itemsToInsert = Array.isArray(values) ? values : [values];
          const inserted = itemsToInsert.map((item) => ({
            id: item.id || crypto.randomUUID(),
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            ...item,
          }));
          records.push(...inserted);
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
              const matched = records.filter((r) => r[field] === value);
              matched.forEach((r) => {
                Object.assign(r, updates, { updated_at: new Date().toISOString() });
              });
              return {
                data: matched,
                error: null,
                select() {
                  return {
                    async single() {
                      return { data: matched[0] || null, error: matched.length ? null : { message: "Not found" } };
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
              const idx = records.findIndex((r) => r[field] === value);
              if (idx !== -1) {
                records.splice(idx, 1);
              }
              return { data: null, error: null };
            },
          };
        },
        then(resolve?: (value: any) => any, reject?: (reason: any) => any) {
          let result = [...records];
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

let browserClientInstance: SupabaseClient | any = null;

/**
 * Returns a Supabase browser client. If environment variables are missing,
 * returns an in-memory client seeded with realistic mock data.
 */
export function createBrowserClient(): SupabaseClient | any {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  if (isSupabaseConfigured()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    browserClientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } else {
    browserClientInstance = createMockBrowserClient();
  }

  return browserClientInstance;
}

export const getSupabaseBrowserClient = createBrowserClient;
