-- Run this in the Supabase project's SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run — every statement is idempotent, so this also works as a
-- migration if you already ran an earlier version of this file.
--
-- Auth itself (auth.users, sign-up, sign-in, password hashing, password
-- reset emails) is handled entirely by Supabase Auth. Passwords are
-- bcrypt-hashed and stored in Supabase's internal auth.users table, which
-- isn't reachable through the public API/anon key — the app never sees or
-- stores a password itself. This file only adds the one table the app
-- needs on top of that.

-- One row per signed-up user: email (denormalized from auth.users, for
-- convenience — auth.users.email stays the source of truth), the editable
-- profile fields (name, username, picture), and a single JSONB blob holding
-- everything else the app backs up (exercises, templates, workouts, unit
-- preference). A single blob matches the shape the client already keeps in
-- localStorage, so there's no separate schema to keep in sync with
-- BarrowApp's local state.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  username text not null default '',
  picture_url text not null default '',
  backup_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row (with email filled in) the moment someone signs
-- up, so the client never has to special-case "row doesn't exist yet".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill email for any profile rows created before this column existed.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email = '';
