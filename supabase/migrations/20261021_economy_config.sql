-- Live Economy & Mission Rewards Config (PLAN Phase 6: Admin Dashboard Editing)
-- Allows /admin in web/ to edit job payouts, mission rewards, and economy constants in Supabase without a client rebuild.

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

insert into public.economy_config (id, constants, job_payouts, mission_rewards)
values ('default', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;
