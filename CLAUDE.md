# DormDAO Dashboard

## Project
Live portfolio analytics platform for DormDAO's 17 university crypto investment clubs.
Live URL: https://dormdao-dashboard.vercel.app
GitHub: https://github.com/clunacrypto/dormdao-dashboard

## Stack
- Next.js 16 (App Router, React Server Components)
- TypeScript + Tailwind CSS + Recharts
- Supabase (Postgres + Storage)
- Google Sheets CSV for portfolio data
- CoinGecko API for live prices
- Vercel deployment

## Layout / Shell
The app uses a collapsible left sidebar on desktop (icon-only at 64px, expands to 200px on hover or pin). The sidebar contains all nav links with active indicator (green left bar + green text), a light/dark mode toggle, a pin-open button, and a user avatar/profile link at the bottom. A fixed top bar sits to the right of the sidebar, showing the current page title, a centered global search bar, a notification bell, a theme toggle, and the user avatar. On mobile, navigation collapses to a bottom tab bar with 5 primary tabs (Leaderboard, Schools, Analytics, Activity, Forum) plus a "More" button that opens a bottom sheet with the remaining links (Tokens, News, DormDocs, About). The app supports full light/dark mode via ThemeProvider with localStorage persistence, defaulting to dark.

## Pages

### / — Splash
Landing page reached first (random background image, "Enter" button). Links into `/map`, the real front door of the site.

### /map — Interactive Campus Map
777-line interactive campus map (`app/map/page.tsx`) — the actual hub reached from the splash page's "Enter" button, linking out to Dorm Builders, Dorm Catalyst, and Dorm Summit.

### /leaderboard — Leaderboard
No-scroll layout that fills full viewport height. Three-panel side-by-side layout:
- Left panel: Quarterly performance table (SCHOOL / USD / ETH, sortable). Shows all schools with current-quarter returns.
- Middle panel: Current Season table — Rank, School, NAV (exact dollars), Return USD %, Return ETH %, % Deployed. Sortable by all columns. Season tabs at top (25–26 / 24–25 / 23–24). Yellow accent border distinguishes it as the primary panel. Sticky headers.
- Right panel: All-Time performance (Rank, School, USD %, ETH %).
All panels support light and dark mode. Data revalidates every 5 minutes.

### /schools — School Portfolios
Grid of school cards. Each shows logo, name, NAV, ETH return, USD return, % deployed. Links to school detail.

### /schools/[slug] — School Detail
Tabs (Positions only shown to that school's leadership or a DormDAO admin):
1. **Portfolio** — Active holdings table (Token, Chain, Tokens held, Cost basis, Current value, Return). Sortable by all columns except Token. Also shows Portfolio Insights card with: win rate, avg position age, most valuable hold, best performer, worst performer, total cost basis. Pie chart of portfolio concentration (external labels, no legend, per director feedback). ETH rows intentionally show "—" for Cost (ETH) — no cost-basis data for the fund's own ETH balance, since it's idle treasury rather than an acquired position.
2. **History** — NAV over time line chart.
3. **Documents** — School-specific pitch decks and reports from Supabase Storage.
4. **Members** — School member list.
5. **Voting** — Active investment proposal voting for this school.
6. **Forum** — Forum threads tagged to that school.
7. **Positions** — Add/edit/delete this school's positions table rows (see "Supabase tables" below) — the fixed inputs the internal NAV/return calculation is built from. Gated by `canModerate()` from `lib/auth-utils.ts`.

### /analytics — Analytics Dashboard
Period selector tabs (current season / 24-25 / 23-24 / all-time). KPI cards: Total Portfolio NAV, Avg USD Return, Avg ETH Return, Avg Deployment. Portfolio NAV by School bar chart. Deployment % vs NAV scatter chart. ETH Holdings table (live USD values via CoinGecko). Recent Buys feed. Sortable School Leaderboard table with exact dollar NAV. Data revalidates every 5 minutes.

### /tokens — Token Index
All tokens held across 17 schools, aggregated. Shows ticker, name, live price, number of schools holding, total tokens, blockchains.

### /tokens/[ticker] — Token Detail
Live price chart, schools holding it, research notes, forum threads tagged to that token, fund documents (pitch decks, exec summaries).

### /activity — Activity Feed
Four tabs: All Activity, Position Entries (new buys), Trims & Exits (sells/decreases), NFT Activity. Shows portfolio changes from the daily snapshot cron stored in `portfolio_changes`.

### /news — DAO Headlines
Two-column editorial layout: featured post large on left, sidebar with smaller posts on right. Users post news/links with a category (Announcement, Market Update, Research, Other). Auth required to post. Rate limited.

### /forum — DAO Forum
Thread list with sort (Hot/New/Top) and category filter (General, Token Research, Strategy, Questions, Announcements). Opens `/forum/[id]` for full thread + reply chain. Auth required to post/reply. Thread authors can delete their own threads. Upvoting requires auth.

### /research — DormDocs
Document library from Supabase Storage (`token-documents` bucket). Filter by type (All / Pitch Decks / Exec Summaries / Fund Reports), sort (Newest, Oldest, School A–Z, Token A–Z), and search by title/school/token. Side-by-side PDF comparison modal (two docs in iframes). Route is `/research`, not `/dormdocs`.

### /compare — Research Note Comparison (stub)
Directory exists (`app/compare/`) but has no `page.tsx` yet. Planned: shareable URLs via `?ids=uuid1,uuid2,uuid3` to compare research notes, accessible to logged-out users.

### /login — Auth
Google OAuth via Supabase. Redirects to `/auth/callback` then back to app.

### /profile — User Profile
Edit display name, school (dropdown of 17 schools), avatar (Pudgy Penguin NFT picker). Auth required, redirects to login if not signed in.

### /users/[id] — Public Profile
Page committed and live (`app/users/[id]/page.tsx`).

### /about — Static Info
Lists all 17 member schools with logos, explains the DormDAO model (3 steps: schools join → pitch tokens → compete).

### /admin — Admin Panel
Gated by `requireAdmin()` (`lib/admin-guard.ts`). Four sections: Settings (`/admin/settings` — includes the "Pause Data Collection" kill switch for outbound Google Sheets calls), Members (`/admin/members` — import/manage member accounts, promote/demote), Email (`/admin/email` — edit the copy/subject/heading of every automated email template), Main DAO (`/admin/main-dao` — manage Main DAO proposals).

### /main-dao — Main DAO Voting
DormDAO-wide investment proposals, voted on by DormDAO admins and Main DAO voters. Renders `VotingClient` in `pageMode`/`isMainDao` mode, keyed to the synthetic Main DAO "school" (`lib/main-dao.ts`).

### /join — Signup Request
Public form (name, email, school, wallet, grad year, major, LinkedIn, Telegram) that inserts into `signup_requests` for an admin to approve/reject from `/admin/members`. No auth required to submit.

### /members — Members Directory
Public directory of member profiles, respecting each profile's own `public_fields` opt-in list (bio/school/graduation_year/major/twitter/linkedin/telegram only shown if the member chose to make that field public).

### /dorm-builders, /dorm-catalyst, /dorm-summit — Showcase Pages
Static marketing/showcase pages for DormDAO's sub-programs, each with a hero + content sections (`components/showcase/*`). Dorm Builders has a real Season 01 program spotlight; Dorm Catalyst and Dorm Summit are intentionally lightweight shells with placeholder sections awaiting real content.

## Project structure
- app/ — Next.js pages and API routes
- app/api/ — all API routes (sheets, prices, notes, snapshot, documents, news, forum, push, notifications)
- components/ — shared React components
- lib/ — utility functions (sheets parser, supabase client, price fetcher, forum types, push.ts, email.ts)
- public/ — static assets including school logos, sw.js (service worker for push notifications)
- scripts/ — Node.js utility scripts

## Data flow
1. Portfolio data: Google Sheets CSV → /api/sheets → parsed server-side → cached 5min. For any school with ≥1 row in the `positions` table, this is overridden entirely — that school's current-season NAV/USD-return/ETH-return/%-deployed are instead computed from `positions` + live CoinGecko prices (see `lib/positions.ts`, `lib/cache.ts`). Historical seasons (24-25, 23-24, Since Inception) and exited/NFT holdings always stay sheet-derived.
2. Token prices: CoinGecko API → /api/prices → cached 60s in-memory
3. Research notes: Supabase postgres → /api/notes
4. Daily snapshots: cron-job.org → POST /api/snapshot → portfolio_snapshots table → fires push + email notifications on changes
5. Fund documents: Supabase Storage (token-documents bucket) → /api/documents
6. News posts: Supabase postgres → /api/news (rate limited, auth required to post)
7. Forum threads/replies: Supabase postgres → /api/forum/threads (auth required to post)
8. Push notifications: web-push (VAPID) → browser via service worker at /sw.js
9. Email notifications: Resend → opted-in users (from: onboarding@resend.dev until dormdao.io domain verified)

## Supabase tables
- research_notes (id, author_name, school, token_ticker, sentiment, content, upvotes, thesis_type, price_target, time_horizon)
- note_votes (id, note_id, user_id)
- portfolio_snapshots (id, captured_at, school_name, nav_usd, eth_return_pct, usd_return_pct, deployed_pct, holdings)
- portfolio_changes (id, detected_at, school_name, change_type, token_ticker, token_name, old_quantity, new_quantity, eth_value)
- token_documents (id, token_ticker, title, school, document_date, file_url, document_type, created_at)
- profiles (id, display_name, school, avatar_url, email_notifications)
- news_posts (id, created_at, title, content, school, category, url, user_id, author_name)
- forum_threads (id, created_at, title, content, school, user_id, author_name, category, token_ticker, upvotes, reply_count, is_pinned)
- forum_replies (id, created_at, thread_id, content, school, user_id, author_name, upvotes)
- forum_thread_votes (id, thread_id, user_id)
- push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
- positions (id, school, ticker, blockchain, tokens, cost_basis_eth, purchase_price_usd, investment_date, created_at, updated_at) — admin-entered fixed position data; a school with ≥1 row here gets its current-season NAV/USD-return/ETH-return/%-deployed computed internally from these + live CoinGecko prices instead of the Google Sheet (see lib/positions.ts, lib/cache.ts's applyInternallyComputedSchools). ticker "ETH" = idle treasury. Managed via the "Positions" tab on a school's page (visible to that school's leadership or a DormDAO admin, gated by canModerate()).

## Scripts
- scripts/upload-pitches.js — bulk uploaded 422 PDFs to Supabase Storage (token-documents bucket). Idempotent, handles 3 folder naming patterns.

## Auth & Notifications
Google OAuth only via Supabase. Bell icon in top bar:
- Not logged in: grayed bell, tooltip "Sign in to enable notifications"
- Logged in, not subscribed: "Stay in the loop" panel with Enable Notifications button
- Subscribed: green filled bell, push pref checkboxes (trades/forum/news, stored in localStorage), email alerts toggle (stored in profiles.email_notifications), Disable link

Push via VAPID/web-push. Email via Resend (free tier). Both fire on portfolio changes and new forum threads.

## Global Search
Search bar in top bar. Idle state shows shortcut categories. On typing: categorized dropdown with matching schools (logos, links to /schools/[slug]), tokens (links to /tokens/[ticker]), and pages. Keyboard navigable.

## Fonts
- Body: `Antikor Text` (clean geometric sans-serif, 5 weights: 400/500/600/700/800), self-hosted via @font-face in globals.css
- Monospace: `Antikor Mono`, self-hosted
- font-family name in code is exactly `'Antikor Text'` — do not use 'Antikor Display' (that is the calligraphic/display variant, not used in the UI)

## Charts
- Portfolio concentration charts are **pie charts** (not donut) with external labels and no legend, per director feedback (Zack Rosenblatt). Component: `components/charts/PortfolioDonut.tsx` (filename kept for historical reasons).

## Environment variables
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SHEETS_CSV_URL
CRON_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
RESEND_API_KEY

## Known issues to fix
1. /compare page stub exists but has no implementation yet

## Coding conventions
- Use TypeScript strictly, no `any` types
- Tailwind for all styling, no inline styles
- Server components by default, client components only when needed (charts, interactivity)
- API routes use Next.js route handlers (app/api/route.ts pattern)
- Always handle loading and error states in UI components
- Light/dark mode: always add `dark:` variants — never hardcode dark-only colors like `text-white`, `bg-gray-900`, `border-gray-800` without a light-mode counterpart
