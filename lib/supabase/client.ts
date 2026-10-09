import { createBrowserClient } from "@supabase/ssr";
import { withFetchTimeout } from "@/lib/fetchWithTimeout";

// See lib/supabase/server.ts — same rationale, applied to the browser client
// so a stalled Supabase request from a client component fails fast instead
// of leaving that component stuck loading forever.
const supabaseFetch = withFetchTimeout(10_000);

// A module-level singleton, not a fresh createBrowserClient() per call.
// ~20 client components (AppShell, VotingClient, Navbar, SchoolTabs, ...)
// call createClient() independently, and several of them are mounted
// simultaneously on the same page (e.g. AppShell + VotingClient on a
// school's Voting tab) — each call used to construct its own GoTrueClient,
// all pointed at the same storage key and the same navigator.locks lock
// name Supabase uses to serialize auth operations across instances/tabs.
// Multiple instances contending for that one lock is a known class of bug
// (Supabase's own "Multiple GoTrueClient instances detected in the same
// browser context" warning) that can leave getUser()/getSession() hanging
// indefinitely under the wrong timing — intermittent by nature, and
// plausibly why it showed up on one Chromium-based browser and not
// another (lock-scheduling timing isn't identical across forks). A single
// shared instance per tab removes the contention entirely.
// Routed through a non-overloaded helper rather than typing `client` as
// `ReturnType<typeof createBrowserClient>` directly — createBrowserClient
// is an overloaded function, and ReturnType on an overloaded function
// resolves only to its last declared signature, which silently widened
// every query result's inferred type across the app (implicit-anys
// everywhere a caller destructured a `.then(({ data }) => ...)`).
function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: supabaseFetch } }
  );
}

let client: ReturnType<typeof makeClient> | undefined;

export function createClient() {
  if (!client) client = makeClient();
  return client;
}
