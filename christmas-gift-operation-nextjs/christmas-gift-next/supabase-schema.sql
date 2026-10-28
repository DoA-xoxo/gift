-- Starter schema only. Review RLS and authentication policy before production use.
create type public.team_key as enum ('human', 'soldier', 'mouse');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 1 and 24),
  team public.team_key not null,
  points_balance integer not null default 1250 check (points_balance >= 0),
  created_at timestamptz not null default now()
);

create table public.team_progress (
  team public.team_key primary key,
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  updated_at timestamptz not null default now()
);
insert into public.team_progress(team, progress) values
  ('human', 42.5), ('soldier', 37.8), ('mouse', 28.6)
on conflict (team) do nothing;

create table public.contributions (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  nickname_snapshot text not null,
  team public.team_key not null,
  points integer not null check (points > 0),
  created_at timestamptz not null default now()
);

create table public.point_transactions (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('contribution', 'sabotage')),
  target_team public.team_key not null,
  points integer not null check (points > 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.team_progress enable row level security;
alter table public.contributions enable row level security;
alter table public.point_transactions enable row level security;

-- Read-only public leaderboard/progress policies. Mutations should be performed through
-- SECURITY DEFINER RPC functions with auth.uid() checks and transactional point deduction.
create policy "profiles readable for leaderboard" on public.profiles for select using (true);
create policy "team progress readable" on public.team_progress for select using (true);
create policy "contributions readable for leaderboard" on public.contributions for select using (true);

-- Production checklist:
-- 1. Configure anonymous/email auth and create a profile only for auth.uid().
-- 2. Implement atomic RPCs: contribute_points(team, points), sabotage_team(team, points), rename_nickname(new_nickname).
-- 3. Each RPC must verify auth.uid(), deduct balance atomically, clamp progress to 0..100,
--    record a transaction, and only insert contribution rows for actual contributions.
-- 4. Add realtime publication for team_progress and contributions.
-- 5. Remove direct client write permissions; test RLS before launch.
