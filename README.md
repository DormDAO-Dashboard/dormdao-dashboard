# DormDAO Portfolio Dashboard

A full-stack crypto portfolio tracker for the DormDAO student investment DAO spanning 17 universities.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase (Postgres + Auth)
- **Data**: Google Sheets CSV (public export) · CoinGecko free API
- **AI**: Anthropic Claude via Vercel AI SDK (streaming)
- **Deployment**: Vercel

## Features

- **Leaderboard** — Sortable table of all 17 schools ranked by NAV, USD return, and ETH return
- **School Detail** — Per-school stats, token holdings, and community research notes
- **Token Grid** — Live prices and 24h changes from CoinGecko for all portfolio tokens
- **Token Detail** — 7-day price sparkline, per-token research notes
- **Research Board** — Community feed with sentiment filtering (bullish/bearish/neutral), upvotes, pagination
- **AI Analyst** — Streaming chat powered by Claude with live portfolio context injected into the system prompt
- **Dark/Light mode** — Stored in localStorage

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd dormdao-dashboard
npm install
```

### 2. Set environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/1wA8KoPlhZ1YYv6auM5yYlzjYCBRnG9en9i_qLsrlVZs/export?format=csv&gid=0
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Enable **Auth → Providers → Email (magic link)** and optionally **Google OAuth**
4. Copy your project URL and keys to `.env.local`

### 4. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`

## Google Sheets Format

The spreadsheet at ID `1wA8KoPlhZ1YYv6auM5yYlzjYCBRnG9en9i_qLsrlVZs` is fetched as a published CSV. The parser auto-detects these columns (case-insensitive):

| Column | Keywords matched |
|--------|-----------------|
| School name | `school`, `name` |
| Rank | `rank` |
| NAV | `nav`, `value`, `portfolio` |
| USD Return | `usd return`, `usd %`, `usd` |
| ETH Return | `eth return`, `eth %`, `eth` |
| Avg Entry FDV | `fdv`, `entry fdv`, `avg entry` |
| % Deployed | `deployed`, `% deployed`, `deployment` |

To publish your Google Sheet: **File → Share → Publish to web → CSV**

## Deploy to Vercel

```bash
npx vercel deploy
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/sheets` | School leaderboard data (5-min cache) |
| `GET /api/prices` | Live token prices from CoinGecko (60s cache) |
| `POST /api/chat` | Streaming AI analyst (Claude) |
| `GET /api/notes` | Research notes with filtering/pagination |
| `POST /api/notes` | Create a research note |
| `DELETE /api/notes/[id]` | Delete own note |
| `POST /api/notes/[id]/upvote` | Upvote a note |
| `GET /api/health` | Health check for all services |

## Database Schema

See `supabase/schema.sql` for the full schema including:
- `research_notes` table with RLS policies
- `note_votes` table with unique constraint
- `increment_note_upvotes` stored function
- Seed data with 5 example notes
