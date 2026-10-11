import { createBrowserClient } from "@supabase/ssr";
import { processLock } from "@supabase/supabase-js";
import { withFetchTimeout } from "@/lib/fetchWithTimeout";

// See lib/supabase/server.ts — same rationale, applied to the browser client
// so a stalled Supabase request from a client component fails fast instead
// of leaving that component stuck loading forever.
const supabaseFetch = withFetchTimeout(10_000);

// auth.lock: processLock — THE actual fix for the recurring "stuck signed
// in" / "Couldn't load this page" reports (blank avatar + no Admin link;
// Voting tab stalling on both Main DAO and school pages). By default
// @supabase/ssr's browser client serializes auth operations (getUser,
// getSession, token refresh) with the Web Locks API (navigator.locks),
// which is scoped per-ORIGIN ACROSS EVERY TAB, not per tab. If a
// lock-holding operation is ever interrupted before it settles — a tab
// closed mid-refresh, a fetch aborted by our own withFetchTimeout above,
// React unmounting mid-request — the lock can be left orphaned forever,
// and every subsequent getUser()/getSession() call in EVERY tab (existing
// or brand new) hangs indefinitely waiting on a lock nothing will ever
// release. This is a well-documented, still-open upstream bug class, not
// something specific to this app: see supabase/supabase-js#2111,
// supabase/supabase#41968, and supabase/supabase discussion #35069.
// Intermittent by nature (only triggered by an interruption at the wrong
// moment) and plausibly browser-dependent (Web Locks scheduling/timing
// around tab-close and abort isn't identical across Chromium forks) —
// matching both the "sometimes, not always" and the "Chrome but not
// Brave" pattern reported.
//
// (A previous fix here wrongly assumed the problem was multiple
// GoTrueClient instances contending for that lock — it was not: the
// browser client already singleton-caches itself internally by default,
// confirmed in @supabase/ssr's own createBrowserClient source. The actual
// problem is the lock itself being orphaned, independent of instance
// count. The singleton wrapper below is kept as cheap, harmless defense
// in depth, not as the fix.)
//
// processLock (shipped by Supabase specifically for this, re-exported
// from @supabase/auth-js) serializes auth operations WITHIN this tab only
// via an in-memory lock, never touching navigator.locks — so there is no
// cross-tab lock left to orphan in the first place. Trade-off: token
// refreshes across multiple open tabs are no longer coordinated with each
// other, but refreshing an already-valid token is a safe, idempotent
// no-op server-side — a wasted redundant request, not a correctness bug.
// That's a trivial cost next to the site intermittently becoming
// unusable until a hard refresh.
function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: supabaseFetch }, auth: { lock: processLock } }
  );
}

let client: ReturnType<typeof makeClient> | undefined;

export function createClient() {
  if (!client) client = makeClient();
  return client;
}
