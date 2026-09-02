import { createBrowserClient } from "@supabase/ssr";
import { withFetchTimeout } from "@/lib/fetchWithTimeout";

// See lib/supabase/server.ts — same rationale, applied to the browser client
// so a stalled Supabase request from a client component fails fast instead
// of leaving that component stuck loading forever.
const supabaseFetch = withFetchTimeout(10_000);

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: supabaseFetch } }
  );
}
