-- RISE — accounts and server-side save (PRD §27), shared by the web and Unity editions.
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
create policy "players: own row" on public.players for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "saves: own rows" on public.saves for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

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
-- Access model: nobody reads or writes crew tables directly except through the functions below. Members can read
-- their own crews; joining needs the code; the treasury moves only through crew_deposit / crew_withdraw (withdrawals
-- are owner-only and bounded by the balance); the owner and name cannot be changed by members.
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  tag text not null check (char_length(tag) between 2 and 4),
  code text not null unique,
  hq_property text,
  treasury bigint not null default 0 check (treasury >= 0),
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
-- Foreign-key indexes (the performance advisor flags unindexed foreign keys).
create index if not exists crews_owner_idx on public.crews (owner);
create index if not exists crew_members_user_idx on public.crew_members (user_id);

alter table public.crews enable row level security;
alter table public.crew_members enable row level security;

-- A security-definer helper avoids the infinite recursion a policy on crew_members would hit if it queried crew_members.
create or replace function public.is_crew_member(p_crew uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.crew_members where crew_id = p_crew and user_id = auth.uid());
$$;

create policy "crews: members read" on public.crews for select using (public.is_crew_member(id));
create policy "members: read your crews" on public.crew_members for select using (public.is_crew_member(crew_id));
-- No insert / update / delete policies on either table: every change goes through the functions.

create or replace function public.create_crew(p_name text, p_tag text) returns public.crews language plpgsql security definer set search_path = public as $$
declare c public.crews;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.crews (name, tag, code, owner)
    values (trim(p_name), upper(trim(p_tag)), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)), auth.uid()) returning * into c;
  insert into public.crew_members (crew_id, user_id) values (c.id, auth.uid());
  return c;
end $$;

create or replace function public.join_crew(p_code text) returns public.crews language plpgsql security definer set search_path = public as $$
declare c public.crews;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into c from public.crews where code = upper(trim(p_code));
  if not found then raise exception 'no crew with that code'; end if;
  insert into public.crew_members (crew_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return c;
end $$;

create or replace function public.leave_crew(p_crew uuid) returns void language sql security definer set search_path = public as $$
  delete from public.crew_members where crew_id = p_crew and user_id = auth.uid();
$$;

create or replace function public.crew_deposit(p_crew uuid, p_amount bigint) returns bigint language plpgsql security definer set search_path = public as $$
declare t bigint;
begin
  if not public.is_crew_member(p_crew) then raise exception 'not a member'; end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  update public.crews set treasury = treasury + p_amount where id = p_crew returning treasury into t;
  return t;
end $$;

create or replace function public.crew_withdraw(p_crew uuid, p_amount bigint) returns bigint language plpgsql security definer set search_path = public as $$
declare t bigint;
begin
  if not exists (select 1 from public.crews where id = p_crew and owner = auth.uid()) then raise exception 'only the owner withdraws'; end if;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  update public.crews set treasury = treasury - p_amount where id = p_crew and treasury >= p_amount returning treasury into t;
  if t is null then raise exception 'the treasury does not reach'; end if;
  return t;
end $$;

create or replace function public.set_crew_hq(p_crew uuid, p_property text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.crews where id = p_crew and owner = auth.uid()) then raise exception 'only the owner sets the HQ'; end if;
  update public.crews set hq_property = p_property where id = p_crew;
end $$;

revoke all on function public.create_crew, public.join_crew, public.leave_crew, public.crew_deposit, public.crew_withdraw, public.set_crew_hq from public, anon;
grant execute on function public.create_crew, public.join_crew, public.leave_crew, public.crew_deposit, public.crew_withdraw, public.set_crew_hq to authenticated;
-- The six functions are SECURITY DEFINER on purpose (they perform writes the tables forbid to clients), so the security
-- advisor will list them; each checks auth.uid() itself, executes only for `authenticated`, and is covered by
-- supabase/tests/crews_authorization.sql. Review that warning as accepted, not ignored.
-- Shared GPS pins, chat and co-op race messages travel on realtime:crew:<crew id>; nothing is stored.

-- ---- Admin dashboard (web /admin, service role only) ----
create or replace view public.admin_overview as
  select (select count(*) from public.players) as players,
         (select count(*) from public.saves) as saves,
         (select coalesce(sum((state->>'cash')::bigint + (state->>'bank')::bigint), 0) from public.saves) as total_naira,
         (select coalesce(avg((state->>'level')::numeric), 0) from public.saves) as avg_level,
         (select count(*) from public.crews) as crews;

-- The admin view is for the service role only.
revoke all on public.admin_overview from public, anon, authenticated;

-- ---- Live Economy & Mission Rewards Config (PLAN Phase 6: Admin Dashboard Editing) ----
-- Read by Unity and Web clients on boot via anon/authenticated SELECT; written exclusively by /admin via service_role.
create table if not exists public.economy_config (
  id text primary key default 'default',
  constants jsonb not null default '{}'::jsonb,
  job_payouts jsonb not null default '{}'::jsonb,
  mission_rewards jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.economy_config enable row level security;

drop policy if exists "economy_config: public read" on public.economy_config;
create policy "economy_config: public read" on public.economy_config for select using (true);
-- Explicitly forbid direct client writes to economy_config; only service_role (/admin) may insert/update/delete.
revoke insert, update, delete on public.economy_config from public, anon, authenticated;

insert into public.economy_config (id, constants, job_payouts, mission_rewards)
values ('default', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

-- ---- Server-Side Save & Balance Validation + Authoritative Reward Claim ----
-- Enforces non-negative cash/bank balances, valid player level bounds (1..100), and caps single-save balance jumps
-- to prevent arbitrary client-side balance tampering on public.saves.
create or replace function public.validate_save_state() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cash bigint := coalesce((new.state->>'cash')::bigint, 0);
  v_bank bigint := coalesce((new.state->>'bank')::bigint, 0);
  v_level int := coalesce((new.state->>'level')::int, 1);
  v_old_total bigint := 0;
  v_max_jump bigint := 50000000; -- ₦50M single-save sanity ceiling
begin
  if v_cash < 0 or v_bank < 0 then
    raise exception 'invalid negative balance in save payload';
  end if;
  if v_level < 1 or v_level > 100 then
    raise exception 'invalid player level in save payload (must be 1..100)';
  end if;
  if tg_op = 'UPDATE' and old.state is not null then
    v_old_total := coalesce((old.state->>'cash')::bigint, 0) + coalesce((old.state->>'bank')::bigint, 0);
    if (v_cash + v_bank) - v_old_total > v_max_jump then
      raise exception 'save balance delta exceeds server-side validation ceiling';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists saves_validate_state on public.saves;
create trigger saves_validate_state before insert or update on public.saves for each row execute function public.validate_save_state();

-- Server-validated reward claim: looks up the authoritative payout in public.economy_config and credits the caller's save.
create or replace function public.claim_verified_reward(p_kind text, p_reward_id text, p_slot text default 'main') returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cfg public.economy_config;
  v_amount bigint := 0;
  v_state jsonb;
  v_cash bigint;
begin
  if v_uid is null then raise exception 'sign in first'; end if;
  select * into v_cfg from public.economy_config where id = 'default';
  if p_kind = 'job' then
    v_amount := coalesce((v_cfg.job_payouts->>p_reward_id)::bigint, 0);
  elsif p_kind = 'mission' then
    v_amount := coalesce((v_cfg.mission_rewards->>p_reward_id)::bigint, 0);
  else
    raise exception 'unknown reward kind';
  end if;
  if v_amount <= 0 or v_amount > 5000000 then
    raise exception 'reward not found or out of bounds';
  end if;
  select state into v_state from public.saves where user_id = v_uid and slot = p_slot for update;
  if not found then
    raise exception 'no active save slot found';
  end if;
  v_cash := coalesce((v_state->>'cash')::bigint, 0) + v_amount;
  update public.saves
    set state = jsonb_set(v_state, '{cash}', to_jsonb(v_cash)), updated_at = now()
    where user_id = v_uid and slot = p_slot;
  return v_cash;
end $$;

revoke all on function public.claim_verified_reward from public, anon;
grant execute on function public.claim_verified_reward to authenticated;


