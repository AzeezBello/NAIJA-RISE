-- Delta for a project that already has schema.sql applied: the two RLS initplan findings and the two missing
-- foreign-key indexes from the Supabase performance advisor. Safe to run more than once.
drop policy if exists "players: own row" on public.players;
create policy "players: own row" on public.players for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "saves: own rows" on public.saves;
create policy "saves: own rows" on public.saves for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index if not exists crews_owner_idx on public.crews (owner);
create index if not exists crew_members_user_idx on public.crew_members (user_id);
