-- Shared authentication migration for:
--   https://gift-iota-kohl.vercel.app/ (public.event_users)
--   Mari's Toy Box (public.user_profiles)
--
-- IMPORTANT:
-- 1) Run the Mari schema.sql first in the SAME Supabase project currently used by the gift site.
-- 2) Back up the database before running this script.
-- 3) This script deliberately stops if the same nickname already exists in both
--    old account tables. Such a collision needs a manual account-ownership decision;
--    the script will not silently overwrite either password hash.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.event_users') is null then
    raise exception 'public.event_users was not found. Use the existing Supabase project from the gift site.';
  end if;
  if to_regclass('public.user_profiles') is null then
    raise exception 'public.user_profiles was not found. Run mari-toybox/supabase/schema.sql first.';
  end if;
end $$;

-- Give every existing gift-site account a stable UUID without changing its nickname or password hash.
alter table public.event_users add column if not exists id uuid;
update public.event_users set id = gen_random_uuid() where id is null;
alter table public.event_users alter column id set default gen_random_uuid();
alter table public.event_users alter column id set not null;
alter table public.event_users add column if not exists nickname_normalized text generated always as (lower(nickname)) stored;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.event_users'::regclass and conname = 'event_users_id_key'
  ) then
    alter table public.event_users add constraint event_users_id_key unique (id);
  end if;
end $$;

alter table public.user_profiles add column if not exists account_id uuid;
alter table public.user_profiles alter column password_hash drop not null;

-- Both applications use nickname as the login ID. Avoid case-only duplicate accounts.
do $$
begin
  if exists (
    select lower(nickname) from public.event_users
    group by lower(nickname) having count(*) > 1
  ) then
    raise exception 'event_users contains IDs that differ only by letter case. Resolve those duplicate IDs before migration.';
  end if;
  if exists (
    select 1
    from public.user_profiles p
    join public.event_users e on lower(e.nickname) = lower(p.nickname)
    where p.account_id is null
  ) then
    raise exception 'An ID exists in both legacy account tables. Resolve the duplicate account first; no passwords were changed.';
  end if;
end $$;
create unique index if not exists user_profiles_account_id_uidx
  on public.user_profiles(account_id);

-- Migrate accounts created by the first Mari prototype. Their bcrypt hash is copied
-- unchanged and remains verifiable by both sites. Existing profile UUIDs and collection
-- references remain untouched.
insert into public.event_users (nickname, password_hash)
select p.nickname, p.password_hash
from public.user_profiles p
where p.account_id is null and p.password_hash is not null
on conflict do nothing;

update public.user_profiles p
set account_id = e.id
from public.event_users e
where p.account_id is null and lower(e.nickname) = lower(p.nickname);

-- Ensure every existing gift-site account already has a Mari game profile.
-- Gift-only users start with 0 points and 0 tokens; their event-site data is untouched.
insert into public.user_profiles (account_id, nickname, password_hash)
select e.id, e.nickname, null
from public.event_users e
where not exists (
  select 1 from public.user_profiles p where p.account_id = e.id
)
on conflict (account_id) do nothing;

-- A profile row no longer stores credentials. All credentials are centralized in event_users.
update public.user_profiles set password_hash = null where account_id is not null;

-- Require every game profile to reference exactly one shared account.
do $$
begin
  if exists (select 1 from public.user_profiles where account_id is null) then
    raise exception 'Some Mari profiles could not be matched to a shared account. Review user_profiles before continuing.';
  end if;
end $$;

alter table public.user_profiles alter column account_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_profiles'::regclass and conname = 'user_profiles_account_id_fkey'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_account_id_fkey
      foreign key (account_id) references public.event_users(id) on delete cascade;
  end if;
end $$;

create unique index if not exists event_users_nickname_normalized_uidx
  on public.event_users (nickname_normalized);

-- New accounts created by either site automatically receive a Mari profile.
-- Nickname changes made in either site are reflected in user_profiles as well.
create or replace function public.sync_event_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_profiles (account_id, nickname, password_hash)
    values (new.id, new.nickname, null)
    on conflict (account_id) do update set nickname = excluded.nickname;
  elsif new.nickname is distinct from old.nickname then
    update public.user_profiles
       set nickname = new.nickname
     where account_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists event_users_sync_mari_profile on public.event_users;
create trigger event_users_sync_mari_profile
after insert or update of nickname on public.event_users
for each row execute function public.sync_event_user_profile();

-- Credential and profile tables are server-only; the browser must never read password hashes.
alter table public.event_users enable row level security;
alter table public.user_profiles enable row level security;
revoke all on table public.event_users from anon, authenticated;
revoke all on table public.user_profiles from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.event_users to service_role;
grant select, insert, update, delete on public.user_profiles to service_role;

commit;
