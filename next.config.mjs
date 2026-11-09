/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 75 is Next's default quality, requested by every next/image usage in
    // the app that doesn't pass an explicit `quality` prop (all but one,
    // app/map/page.tsx:442, which passes 90) — restricting this list to
    // [90] alone made every one of those requests 400
    // (INVALID_IMAGE_OPTIMIZE_REQUEST), breaking most images site-wide,
    // avatars included. Confirmed live against production.
    qualities: [75, 90],
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "ipfs.io" },
      // Self-hosted Pudgy Penguin avatars (public "pudgy-avatars" bucket) —
      // see lib/penguins.ts, scripts/migrate-pudgy-avatars.mjs.
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [{ protocol: "https", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname }]
        : []),
    ],
  },
  // Predictions' original tabs now live on Oregon's prediction page;
  // keep old links working. (Not permanent: other schools get pages later.)
  async redirects() {
    return [
      { source: "/predictions/leaderboard", destination: "/predictions/schools/oregon/performance", permanent: false },
      { source: "/predictions/:tab(portfolio|archive|submit)", destination: "/predictions/schools/oregon/:tab", permanent: false },
      { source: "/predictions/pitches/:id", destination: "/predictions/schools/oregon/pitches/:id", permanent: false },
    ];
  },
  // No Content-Security-Policy here yet — this app's actual script/style/
  // image sources need to be inventoried and the policy verified against a
  // live build before shipping one; a wrong CSP fails silently in
  // production with no build-time signal, unlike these headers below.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
