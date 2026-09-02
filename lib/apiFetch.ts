import { withFetchTimeout } from "@/lib/fetchWithTimeout";

// For client components calling our own /api/* routes with a plain fetch().
// Those calls had no timeout at all — unlike Supabase's client (patched via
// global.fetch in lib/supabase/{server,client}.ts), a raw fetch() here has
// nothing bounding it, so a single stalled request left components stuck in
// their loading state forever (see AppShell.tsx / VotingClient.tsx).
export const apiFetch = withFetchTimeout(10_000);
