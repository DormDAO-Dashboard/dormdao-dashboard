import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { withFetchTimeout } from "@/lib/fetchWithTimeout";

// Supabase's client threads `global.fetch` through to auth (getUser,
// exchangeCodeForSession, ...), every `.from()` query, and storage alike —
// setting it here bounds ALL of those in one place, instead of a stalled
// request (no default timeout) hanging whatever page/route awaited it
// forever. This is what was behind login getting stuck and pages like Main
// DAO or a vote page loading forever on some visits but not others.
const supabaseFetch = withFetchTimeout(10_000);

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
