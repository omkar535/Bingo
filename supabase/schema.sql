-- ============================================================
-- BINGO MULTIPLAYER — SUPABASE DATABASE SCHEMA
-- Run this in the Supabase SQL Editor (or via `supabase db push`)
-- ============================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES
-- Maps 1:1 to auth.users. The app UI only collects a username +
-- password, but Supabase Auth requires an email internally, so
-- on signup the client generates a synthetic, non-routable email
-- like "<username>@bingo.internal". The profiles table stores the
-- public-facing username / display name and enforces uniqueness.
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text not null,
  avatar_color  text not null default '#6c3ce9',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  constraint display_name_length check (char_length(display_name) between 1 and 30)
);

create index if not exists idx_profiles_username on public.profiles (lower(username));

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. FRIENDS
-- Directed request rows. status: 'pending' | 'accepted'
-- A friendship is represented by two accepted rows (one each way)
-- OR by convention we store one row and treat it as symmetric.
-- We use a single symmetric row with a canonical ordering
-- (user_low, user_high) to avoid duplicates.
-- ============================================================
create table if not exists public.friends (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  constraint no_self_friend check (requester_id <> addressee_id),
  constraint unique_pair unique (requester_id, addressee_id)
);

create index if not exists idx_friends_requester on public.friends (requester_id);
create index if not exists idx_friends_addressee on public.friends (addressee_id);

-- ============================================================
-- 3. ROOMS
-- status: 'waiting' | 'setup' | 'playing' | 'finished'
-- turn_order: jsonb array of user_ids in play order (host first)
-- numbers_called: jsonb array of integers 1-25 already selected
-- ============================================================
create table if not exists public.rooms (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  host_id             uuid not null references public.profiles(id) on delete cascade,
  status              text not null default 'waiting' check (status in ('waiting', 'setup', 'playing', 'finished')),
  turn_order          jsonb not null default '[]'::jsonb,
  current_turn_index  int not null default 0,
  numbers_called      jsonb not null default '[]'::jsonb,
  winners             jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint code_format check (code ~ '^[A-Z0-9]{6}$')
);

create index if not exists idx_rooms_code on public.rooms (code);
create index if not exists idx_rooms_status on public.rooms (status);

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

-- Always store room codes upper-case
create or replace function public.normalize_room_code()
returns trigger as $$
begin
  new.code = upper(new.code);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_rooms_normalize_code on public.rooms;
create trigger trg_rooms_normalize_code
  before insert or update on public.rooms
  for each row execute function public.normalize_room_code();

-- ============================================================
-- 4. ROOM_PLAYERS
-- One row per player per room.
-- grid: jsonb array[25] of numbers 1-25 (the player's board)
-- marked: jsonb array of numbers the player has marked (subset of numbers_called)
-- lines_struck: jsonb array of letters already struck e.g. ["B","I"]
-- rank: final placement (1 = gold), null while unresolved
-- ============================================================
create table if not exists public.room_players (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  join_order      int not null,
  is_host         boolean not null default false,
  is_ready        boolean not null default false,
  grid            jsonb,
  grid_ready      boolean not null default false,
  lines_struck    jsonb not null default '[]'::jsonb,
  has_bingo       boolean not null default false,
  bingo_clicked_at timestamptz,
  rank            int,
  joined_at       timestamptz not null default now(),
  constraint unique_room_user unique (room_id, user_id)
);

create index if not exists idx_room_players_room on public.room_players (room_id);
create index if not exists idx_room_players_user on public.room_players (user_id);

-- Enforce max 10 players per room via trigger (defense in depth;
-- also enforced client-side before insert)
create or replace function public.check_room_capacity()
returns trigger as $$
declare
  player_count int;
begin
  select count(*) into player_count from public.room_players where room_id = new.room_id;
  if player_count >= 10 then
    raise exception 'Room is full (max 10 players)';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_room_capacity on public.room_players;
create trigger trg_room_capacity
  before insert on public.room_players
  for each row execute function public.check_room_capacity();

-- ============================================================
-- 5. AUTO-CREATE PROFILE ON SIGNUP
-- Reads username / display_name out of auth.users.raw_user_meta_data
-- (set by the client during supabase.auth.signUp)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data->>'username'),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- ---- PROFILES ----
-- Anyone authenticated can read basic profile info (needed for
-- lobby lists, friend search, player panels, etc.)
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Insert happens via the handle_new_user trigger (security definer),
-- so no direct insert policy is required for normal clients.

-- ---- FRIENDS ----
create policy "friends_select_own"
  on public.friends for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friends_insert_own"
  on public.friends for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "friends_update_participant"
  on public.friends for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friends_delete_participant"
  on public.friends for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ---- ROOMS ----
-- Any authenticated user can look up a room by code to join it,
-- and any member of a room can see/update it during play.
create policy "rooms_select_authenticated"
  on public.rooms for select
  to authenticated
  using (true);

create policy "rooms_insert_own"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = host_id);

create policy "rooms_update_members"
  on public.rooms for update
  to authenticated
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.room_players rp
      where rp.room_id = rooms.id and rp.user_id = auth.uid()
    )
  );

create policy "rooms_delete_host"
  on public.rooms for delete
  to authenticated
  using (auth.uid() = host_id);

-- ---- ROOM_PLAYERS ----
create policy "room_players_select_authenticated"
  on public.room_players for select
  to authenticated
  using (true);

create policy "room_players_insert_self"
  on public.room_players for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "room_players_update_self_or_host"
  on public.room_players for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.rooms r
      where r.id = room_players.room_id and r.host_id = auth.uid()
    )
  );

create policy "room_players_delete_self_or_host"
  on public.room_players for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.rooms r
      where r.id = room_players.room_id and r.host_id = auth.uid()
    )
  );

-- ============================================================
-- REALTIME
-- Add tables to the supabase_realtime publication so postgres
-- changes stream to subscribed clients.
-- ============================================================
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
