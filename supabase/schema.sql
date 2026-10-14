-- NAIJA RISE — accounts and server-side save (PRD §27), shared by the web and Unity editions.
-- Apply in the Supabase SQL editor (or `supabase db push`). Auth is Supabase Auth (email + password).

create table if not exists public.players (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Tunde',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null default 'main',
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.players enable row level security;
alter table public.saves enable row level security;

-- Every player sees and writes only their own rows.
create policy "players: own row" on public.players for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saves: own rows" on public.saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep last_seen fresh whenever a save lands.
create or replace function public.touch_player() returns trigger language plpgsql security definer as $$
begin
  insert into public.players (user_id) values (new.user_id) on conflict (user_id) do update set last_seen = now();
  return new;
end $$;
drop trigger if exists saves_touch_player on public.saves;
create trigger saves_touch_player after insert or update on public.saves for each row execute function public.touch_player();

-- Multiplayer uses Supabase Realtime broadcast on channels named realtime:district:<region id>; no tables needed.
-- In the dashboard: Project Settings → API → Realtime enabled; Authentication → Providers → Email.

-- ---- Crews (PLAN Phase 5): create or join by code, a shared treasury, an HQ at a member's owned property ----
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null check (char_length(tag) between 2 and 4),
  code text not null unique,                       -- join code shared between players
  hq_property text,                                -- property id from the district data
  treasury bigint not null default 0,
  owner uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default 'Tunde',
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
-- Anyone signed in can look a crew up by code to join it; only members read the rest and only members change it.
create policy "crews: lookup by code" on public.crews for select using (auth.role() = 'authenticated');
create policy "crews: owner creates" on public.crews for insert with check (auth.uid() = owner);
create policy "crews: members update" on public.crews for update using (exists (select 1 from public.crew_members m where m.crew_id = id and m.user_id = auth.uid()));
create policy "members: see your crews" on public.crew_members for select using (auth.uid() = user_id or exists (select 1 from public.crew_members m where m.crew_id = crew_id and m.user_id = auth.uid()));
create policy "members: join yourself" on public.crew_members for insert with check (auth.uid() = user_id);
create policy "members: leave yourself" on public.crew_members for delete using (auth.uid() = user_id);
-- Shared GPS pins, chat and co-op race messages travel on realtime:crew:<crew id>; nothing is stored.

-- ---- Admin dashboard (web /admin, service role only) ----
create or replace view public.admin_overview as
  select (select count(*) from public.players) as players,
         (select count(*) from public.saves) as saves,
         (select coalesce(sum((state->>'cash')::bigint + (state->>'bank')::bigint), 0) from public.saves) as total_naira,
         (select coalesce(avg((state->>'level')::numeric), 0) from public.saves) as avg_level,
         (select count(*) from public.crews) as crews;
