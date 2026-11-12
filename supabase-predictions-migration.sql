-- OBG Prediction Markets tables, in the DormDAO project.
-- Run this in the Supabase SQL editor, then supabase-predictions-seed.sql,
-- then set PREDICTIONS_SOURCE=supabase in Vercel to switch the site over.
--
-- Every table is prefixed pm_. Prices are probabilities 0–1 for the pitch's
-- chosen side (36¢ = 0.36).
--
-- RLS is on with no policies: only the service role (server code, after the
-- Oregon/admin gate in lib/predictions/access.ts) can read or write. Members
-- never query these tables directly, so individual votes stay private.

begin;

create table if not exists public.pm_rounds (
  number             int primary key check (number > 0),
  school             text not null default 'Oregon',
  published_at       date not null,
  medium_url         text,
  summary            text,
  selected_pitch_id  text,  -- vote winner; null while voting is open (FK below)
  created_at         timestamptz not null default now()
);

create table if not exists public.pm_pitches (
  id                 text primary key,
  round_number       int not null references public.pm_rounds(number) on delete cascade,
  sector             text not null check (sector in ('economics', 'ai_tech', 'politics')),
  analyst            text not null,
  market_title       text not null,
  outcome_label      text not null,
  venue              text not null check (venue in ('polymarket', 'kalshi', 'synthesis')),
  market_source      text not null check (market_source in ('polymarket', 'kalshi', 'polymarket_basket', 'manual')),
  -- Polymarket slug(s) or Kalshi ticker: none for manual, 2+ for a basket.
  market_ids         text[] not null default '{}',
  side               text not null check (side in ('YES', 'NO')),
  entry_price        numeric(5,4) not null check (entry_price between 0 and 1),
  implied_price      numeric(5,4) not null check (implied_price between 0 and 1),
  sell_limit         numeric(5,4) check (sell_limit between 0 and 1),
  sell_limit_before  date,
  stop_loss          numeric(5,4) check (stop_loss between 0 and 1),
  exit_by            date,
  exit_price         numeric(5,4) check (exit_price between 0 and 1),
  exited_at          date,
  thesis             text[] not null default '{}',
  status             text not null default 'open' check (status in ('open', 'closed')),
  recorded_votes     int check (recorded_votes >= 0),  -- for rounds voted outside the site
  created_at         timestamptz not null default now(),
  constraint pm_pitches_market_ids_shape check (
    case market_source
      when 'manual' then cardinality(market_ids) = 0
      when 'polymarket_basket' then cardinality(market_ids) >= 2
      else cardinality(market_ids) = 1
    end
  ),
  constraint pm_pitches_id_round_unique unique (id, round_number)
);

create index if not exists pm_pitches_round_idx on public.pm_pitches (round_number);

-- The winner must be one of that round's own pitches.
alter table public.pm_rounds drop constraint if exists pm_rounds_selected_pitch_fk;
alter table public.pm_rounds
  add constraint pm_rounds_selected_pitch_fk
  foreign key (selected_pitch_id, number)
  references public.pm_pitches (id, round_number)
  deferrable initially deferred;

-- One vote per member per round, for a pitch in that round.
create table if not exists public.pm_votes (
  round_number  int  not null,
  user_id       uuid not null references auth.users(id) on delete cascade,
  pitch_id      text not null,
  created_at    timestamptz not null default now(),
  primary key (round_number, user_id),
  foreign key (pitch_id, round_number)
    references public.pm_pitches (id, round_number) on delete cascade
);

-- Real fills on the executed pitch. resolve = market settled (price 0 or 1).
create table if not exists public.pm_trades (
  id           uuid primary key default gen_random_uuid(),
  pitch_id     text not null references public.pm_pitches(id) on delete cascade,
  action       text not null check (action in ('buy', 'sell', 'resolve')),
  contracts    numeric(14,4) not null check (contracts > 0),
  price        numeric(5,4) not null check (price between 0 and 1),
  executed_at  timestamptz not null,
  reason       text check (reason in ('sell_limit', 'stop_loss', 'resolution', 'exit_date', 'manual')),
  created_at   timestamptz not null default now()
);

create index if not exists pm_trades_pitch_idx on public.pm_trades (pitch_id, executed_at);

alter table public.pm_rounds  enable row level security;
alter table public.pm_pitches enable row level security;
alter table public.pm_votes   enable row level security;
alter table public.pm_trades  enable row level security;

commit;
