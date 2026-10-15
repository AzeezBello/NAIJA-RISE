-- Functional authorization test for the crew model. Run it in the Supabase SQL editor (as the default postgres role).
-- It creates three throwaway users, exercises every rule as each of them, raises an exception naming the first rule
-- that fails, and ROLLS BACK, leaving no data behind. A passing run ends with the notice "crews_authorization: all rules hold".
begin;

create temp table _users as
  select gen_random_uuid() as owner_id, gen_random_uuid() as member_id, gen_random_uuid() as outsider_id;
insert into auth.users (id, aud, role, email)
  select owner_id, 'authenticated', 'authenticated', 'owner-' || owner_id || '@test.invalid' from _users
  union all select member_id, 'authenticated', 'authenticated', 'member-' || member_id || '@test.invalid' from _users
  union all select outsider_id, 'authenticated', 'authenticated', 'outsider-' || outsider_id || '@test.invalid' from _users;
create temp table _ctx (crew_id uuid, code text);
grant all on _users, _ctx to anon, authenticated;

create or replace function pg_temp.act_as(who uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.expect_error(label text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then return; end;
  raise exception 'FAILED: % should have been refused', label;
end $$;
create or replace function pg_temp.assert(label text, cond boolean) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAILED: %', label; end if; end $$;

do $$
declare u record; c public.crews; n int; t bigint;
begin
  select * into u from _users;

  -- 0. anonymous callers cannot reach any crew function
  execute 'set local role anon';
  perform pg_temp.expect_error('anon create_crew', $q$select public.create_crew('Ghosts', 'GHO')$q$);
  perform pg_temp.expect_error('anon join_crew', $q$select public.join_crew('AAAAAA')$q$);
  execute 'reset role';

  -- 1. the owner creates a crew and is its first member
  perform pg_temp.act_as(u.owner_id);
  select * into c from public.create_crew('Iponri Boys', 'ipb');
  perform pg_temp.assert('create_crew returns a 6 character code', char_length(c.code) = 6);
  perform pg_temp.assert('tag is upper-cased', c.tag = 'IPB');
  perform pg_temp.assert('creator is a member', public.is_crew_member(c.id));
  insert into _ctx values (c.id, c.code);
  execute 'reset role';

  -- 2. an outsider sees nothing and can change nothing
  perform pg_temp.act_as(u.outsider_id);
  select count(*) into n from public.crews; perform pg_temp.assert('outsider cannot list crews', n = 0);
  select count(*) into n from public.crew_members; perform pg_temp.assert('outsider cannot list members', n = 0);
  perform pg_temp.expect_error('outsider deposit', format('select public.crew_deposit(%L, 100)', c.id));
  perform pg_temp.expect_error('outsider withdraw', format('select public.crew_withdraw(%L, 1)', c.id));
  perform pg_temp.expect_error('outsider set HQ', format('select public.set_crew_hq(%L, ''room'')', c.id));
  perform pg_temp.expect_error('join with a wrong code', $q$select public.join_crew('ZZZZZZ')$q$);
  perform pg_temp.expect_error('direct insert into crew_members', format('insert into public.crew_members (crew_id, user_id) values (%L, auth.uid())', c.id));
  execute 'reset role';

  -- 3. a member joins by code, can deposit, but cannot withdraw, set the HQ or rewrite the crew
  perform pg_temp.act_as(u.member_id);
  perform public.join_crew((select code from _ctx));
  perform pg_temp.assert('member now sees the crew', (select count(*) from public.crews) = 1);
  select public.crew_deposit(c.id, 5000) into t; perform pg_temp.assert('deposit adds to the treasury', t = 5000);
  perform pg_temp.expect_error('deposit of zero', format('select public.crew_deposit(%L, 0)', c.id));
  perform pg_temp.expect_error('negative deposit', format('select public.crew_deposit(%L, -50)', c.id));
  perform pg_temp.expect_error('member withdraw', format('select public.crew_withdraw(%L, 1)', c.id));
  perform pg_temp.expect_error('member set HQ', format('select public.set_crew_hq(%L, ''room'')', c.id));
  update public.crews set treasury = 999999999, owner = auth.uid(), name = 'Hijacked';
  get diagnostics n = row_count; perform pg_temp.assert('direct update of crews changes nothing', n = 0);
  execute 'reset role';
  perform pg_temp.assert('treasury untouched by the direct update', (select treasury from public.crews where id = c.id) = 5000);
  perform pg_temp.assert('owner untouched by the direct update', (select owner from public.crews where id = c.id) = u.owner_id);

  -- 4. only the owner withdraws, bounded by the balance, and sets the HQ
  perform pg_temp.act_as(u.owner_id);
  perform pg_temp.expect_error('withdraw more than the treasury', format('select public.crew_withdraw(%L, 5001)', c.id));
  select public.crew_withdraw(c.id, 2000) into t; perform pg_temp.assert('withdraw reduces the treasury', t = 3000);
  perform public.set_crew_hq(c.id, 'room');
  execute 'reset role';
  perform pg_temp.assert('HQ recorded', (select hq_property from public.crews where id = c.id) = 'room');

  -- 5. a member can leave, then loses access
  perform pg_temp.act_as(u.member_id);
  perform public.leave_crew(c.id);
  perform pg_temp.assert('after leaving, the crew is invisible', (select count(*) from public.crews) = 0);
  perform pg_temp.expect_error('deposit after leaving', format('select public.crew_deposit(%L, 1)', c.id));
  execute 'reset role';

  raise notice 'crews_authorization: all rules hold';
end $$;

rollback;
