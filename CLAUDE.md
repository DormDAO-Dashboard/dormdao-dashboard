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

## Pages
- / — Leaderboard (seasonal tabs)
- /analytics — Analytics dashboard (KPI cards, charts, ETH holdings, recent buys)
- /schools — Schools grid
- /schools/[slug] — School detail (Portfolio/History/Members/Documents/Forum tabs)
- /tokens — Token index
- /tokens/[ticker] — Token detail + research notes + forum discussions + fund documents
- /activity — Activity feed (All Activity / Position Entries / Trims & Exits / NFT Activity)
- /research — DormDocs research notes
- /news — DAO Headlines community feed
- /forum — DAO Forum (thread list + /forum/[id] thread detail)
- /login — Google OAuth
- /profile — User profile
- /users/[id] — Public profile
- /about — Static info

## Project structure
- app/ — Next.js pages and API routes
- app/api/ — all API routes (sheets, prices, notes, snapshot, documents, news, forum)
- components/ — shared React components
- lib/ — utility functions (sheets parser, supabase client, price fetcher, forum types)
- public/ — static assets including school logos
- scripts/ — Node.js utility scripts (upload-pitches.js for bulk PDF upload)

## Data flow
1. Portfolio data: Google Sheets CSV → /api/sheets → parsed server-side → cached 5min
2. Token prices: CoinGecko API → /api/prices → cached 60s in-memory
3. Research notes: Supabase postgres → /api/notes
4. Daily snapshots: cron-job.org → POST /api/snapshot → portfolio_snapshots table
5. Fund documents: Supabase Storage (token-documents bucket) → /api/documents
6. News posts: Supabase postgres → /api/news (rate limited, auth required to post)
7. Forum threads/replies: Supabase postgres → /api/forum/threads (auth required to post)

## Supabase tables
- research_notes (id, author_name, school, token_ticker, sentiment, content, upvotes, thesis_type, price_target, time_horizon)
- note_votes (id, note_id, user_id)
- portfolio_snapshots (id, captured_at, school_name, nav_usd, eth_return_pct, usd_return_pct, deployed_pct, holdings)
- portfolio_changes (id, detected_at, school_name, change_type, token_ticker, token_name, old_quantity, new_quantity, eth_value)
- token_documents (id, token_ticker, title, school, document_date, file_url, document_type, created_at)
- profiles (id, display_name, school, avatar_url)
- news_posts (id, created_at, title, content, school, category, url, user_id, author_name)
- forum_threads (id, created_at, title, content, school, user_id, author_name, category, token_ticker, upvotes, reply_count, is_pinned)
- forum_replies (id, created_at, thread_id, content, school, user_id, author_name, upvotes)
- forum_thread_votes (id, thread_id, user_id)

## Environment variables
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SHEETS_CSV_URL
CRON_SECRET

## Known issues to fix
1. ETH rows on school detail pages show "—" for Chain, Tokens, Cost

## Coding conventions
- Use TypeScript strictly, no `any` types
- Tailwind for all styling, no inline styles
- Server components by default, client components only when needed (charts, interactivity)
- API routes use Next.js route handlers (app/api/route.ts pattern)
- Always handle loading and error states in UI components