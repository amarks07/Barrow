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
-- everything else the app backs up (exercises, routines, workouts, unit
-- preference). A single blob matches the shape the client already keeps in
-- localStorage, so there's no separate schema to keep in sync with
-- BarrowApp's local state.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  public_id text not null default '',
  email text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  username text not null default '',
  picture_url text not null default '',
  birthday date,
  gender text not null default '',
  height numeric,
  weight numeric,
  premium boolean not null default false,
  premium_renewal timestamptz,
  premium_override boolean not null default false,
  backup_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists public_id text not null default '';
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists birthday date;
-- Replaced by birthday above. Drops any age data already stored — permanent.
alter table public.profiles drop column if exists age;
alter table public.profiles add column if not exists gender text not null default '';
alter table public.profiles add column if not exists height numeric;
alter table public.profiles add column if not exists weight numeric;
alter table public.profiles add column if not exists premium boolean not null default false;
-- Paid-through date from the payment provider (RevenueCat webhook — see
-- supabase/functions/revenuecat-webhook), not user-editable. NULL until the
-- first purchase event arrives.
alter table public.profiles add column if not exists premium_renewal timestamptz;
-- Manual "comp" escape hatch, e.g. for friends/family or support gestures —
-- flip to true directly in the SQL editor (see protect_premium_columns
-- below for why that still works despite the trigger) to give someone
-- premium permanently, immune to whatever the RevenueCat webhook later
-- reports for their account.
alter table public.profiles add column if not exists premium_override boolean not null default false;

-- Belt-and-suspenders: Supabase Auth already rejects a sign-up with an
-- email already in auth.users, but this guards the profiles table itself
-- in case that ever changes (e.g. "Allow duplicate emails" gets toggled on
-- in the Auth settings). Partial index so the backfilled '' defaults on old
-- rows (before this column existed) don't collide with each other.
drop index if exists profiles_email_key;
create unique index profiles_email_key on public.profiles (email) where email <> '';

-- Short human-friendly identifier (e.g. "b-482913") shown in the app in
-- place of the opaque auth.users uuid — for support requests, sharing, etc.
-- Random rather than sequential so it doesn't leak signup order/volume.
create or replace function public.generate_public_id()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'b-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (select 1 from public.profiles where public_id = candidate);
  end loop;
  return candidate;
end;
$$;

-- Partial index for the same reason as profiles_email_key above: the
-- backfilled '' defaults on pre-existing rows shouldn't collide with
-- each other.
drop index if exists profiles_public_id_key;
create unique index profiles_public_id_key on public.profiles (public_id) where public_id <> '';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Profile/biometric fields (name, username, birthday, gender, height,
-- weight, picture) sync to the cloud for every signed-in account, free or
-- premium — only backup_data (exercises/routines/workouts/unit) is a
-- premium entitlement. Column-level enforcement of that narrower paywall
-- lives in protect_premium_columns below (a row-level policy can't
-- distinguish which columns an UPDATE touches), so this policy just checks
-- ownership.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- `premium`/`premium_renewal`/`premium_override` are entitlement state
-- driven only by the payment provider's webhook (supabase/functions/
-- revenuecat-webhook), which writes with the service_role key, or by you
-- directly in the SQL editor. auth.role() reads from the request's JWT
-- claims, which only exist for requests that went through PostgREST/GoTrue
-- — a query run in the SQL editor has none, so auth.role() is null there
-- and `<> 'service_role'` is unknown/falsy, letting the write through. Any
-- request that *does* carry a JWT (i.e. every write from the app's client)
-- has a real role of 'authenticated' or 'anon', which fails the check and
-- gets silently reverted — so a modified/patched client can't grant itself
-- premium by including these columns in an update payload.
--
-- premium_override adds a second, stronger guarantee on top of that: once a
-- row has it set (only settable the same way, from the SQL editor), premium
-- is pinned true against every subsequent writer including the webhook —
-- so a manually-comped account can't be un-premiumed by an EXPIRATION event
-- for a subscription it was never actually paying for.
--
-- Also protects backup_data: profiles_update_own now lets any owner update
-- their own row (see above), but the workout/exercise/routine backup itself
-- stays a premium entitlement — a non-premium writer (anything but
-- service_role) gets backup_data silently reverted to its previous value,
-- same "revert rather than error" treatment as the premium columns
-- themselves. Checked against new.premium (already normalized above, so
-- this sees the real post-normalization entitlement) rather than
-- old.premium, so a premium_override row still gets to write backup_data
-- even from a stale client that doesn't know about it yet.
--
-- Clearing to '{}' is exempted from that revert: "Clear backup data"
-- (clearBackupData in useCloudSync.js) is deliberately shown to non-premium
-- accounts that still have a stale backup left over from before a downgrade
-- (hasBackupData — see DangerZoneSection.js), so a deletion must go through
-- even without premium. Without this exemption the revert above silently
-- no-ops that exact write: the client gets no error and clears its own
-- hasBackupData flag, but the cloud row's backup_data — every custom
-- exercise, routine, and past workout in it — is left completely intact.
-- Only the empty object is allowed through non-premium; any non-empty
-- backup_data still reverts, so a non-premium client can never use this
-- path to write/restore real backup data.
create or replace function public.protect_premium_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    new.premium := old.premium;
    new.premium_renewal := old.premium_renewal;
    new.premium_override := old.premium_override;
  end if;

  if old.premium_override then
    new.premium := true;
  end if;

  if not new.premium and auth.role() <> 'service_role' and new.backup_data <> '{}'::jsonb then
    new.backup_data := old.backup_data;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_premium_columns on public.profiles;
create trigger protect_premium_columns
  before update on public.profiles
  for each row execute procedure public.protect_premium_columns();

-- Auto-create a profile row (with email filled in) the moment someone signs
-- up, so the client never has to special-case "row doesn't exist yet".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, public_id)
  values (new.id, new.email, public.generate_public_id());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Narrow, deliberate hole in profiles_update_own: profile pictures are
-- available to every signed-in user, not just premium (unlike every other
-- identity field, which only syncs to the cloud row under premium — see
-- profiles_update_own above and useCloudSync.js). SECURITY DEFINER runs as
-- the table owner, bypassing RLS entirely, but the function body only ever
-- touches picture_url on the caller's own row (auth.uid()), so it can't be
-- used to write anything else. Called via supabase.rpc from the client
-- (useProfilePicture.js) after a successful S3 upload/removal.
create or replace function public.set_profile_picture_url(new_url text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set picture_url = new_url, updated_at = now() where id = auth.uid();
end;
$$;

revoke all on function public.set_profile_picture_url(text) from public;
grant execute on function public.set_profile_picture_url(text) to authenticated;

-- One row per (user, date) holding that day's workouts — split out of
-- profiles.backup_data because `workouts` was the only part of that JSONB
-- blob that grows unboundedly with continued use, and Postgres has no
-- partial-JSONB update: any change to backup_data rewrote the user's entire
-- lifetime workout history as a new row version on every debounced edit
-- (see pushNow in useCloudSync.js). `data` holds the same array shape
-- backup_data.workouts[dateKey] used to (see migrateWorkouts in
-- packages/core/src/workouts.js for the per-workout shape). `workout_date`
-- matches toKey() in packages/core/src/date.js — a local calendar date
-- string ("YYYY-MM-DD"), stored as a real `date` column so PostgREST
-- round-trips it as that same string with no timezone handling needed.
create table if not exists public.workout_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_date date not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, workout_date)
);

alter table public.workout_logs enable row level security;

-- Row-level equivalent of profiles' protect_premium_columns trigger — a
-- plain RLS policy suffices here (unlike profiles, every column of this
-- table IS backup data, so there's no need to distinguish which columns an
-- UPDATE touches). The exists() subquery reads the caller's own profiles
-- row, which is safe under profiles_select_own (auth.uid() = id) — no RLS
-- recursion, since profiles' own policies never reference workout_logs.
drop policy if exists "workout_logs_insert_premium" on public.workout_logs;
create policy "workout_logs_insert_premium" on public.workout_logs
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.premium)
  );

drop policy if exists "workout_logs_update_premium" on public.workout_logs;
create policy "workout_logs_update_premium" on public.workout_logs
  for update using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.premium)
  );

-- Unconditional (no premium check), unlike insert/update above — mirrors
-- the "Clear backup data" exemption protect_premium_columns carves out for
-- profiles.backup_data: a downgraded-from-premium account must still be
-- able to read its own stale rows (hasBackupData in useCloudSync.js) and
-- delete them (Danger zone's "Clear backup data", and the cascade from
-- deleteAccount), even though it can no longer write new backup data.
drop policy if exists "workout_logs_select_own" on public.workout_logs;
create policy "workout_logs_select_own" on public.workout_logs
  for select using (auth.uid() = user_id);

drop policy if exists "workout_logs_delete_own" on public.workout_logs;
create policy "workout_logs_delete_own" on public.workout_logs
  for delete using (auth.uid() = user_id);

-- Friends: one row per pair of users, direction-agnostic (the unique index
-- below normalizes requester/recipient into least/greatest so A->B and B->A
-- can never both exist as separate rows). 'pending' means requester_id is
-- waiting on recipient_id to accept; QR-code adds (see
-- add_friend_by_public_id below) skip straight to 'accepted' since both
-- people already proved presence to each other by scanning.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> recipient_id)
);

drop index if exists friendships_pair_key;
create unique index friendships_pair_key on public.friendships (
  least(requester_id, recipient_id), greatest(requester_id, recipient_id)
);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own" on public.friendships
  for select using (auth.uid() in (requester_id, recipient_id));

-- Direct inserts (defense in depth — send_friend_request/add_friend_by_public_id
-- below are security definer and do the real inserting) still can't impersonate
-- another user as the requester.
drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own" on public.friendships
  for insert with check (auth.uid() = requester_id);

-- Only the recipient can accept a pending request — the client does this as a
-- plain update (status: 'pending' -> 'accepted'), no RPC needed.
drop policy if exists "friendships_update_recipient" on public.friendships;
create policy "friendships_update_recipient" on public.friendships
  for update using (auth.uid() = recipient_id);

-- Either side can delete: declining an incoming request, cancelling an
-- outgoing one, or unfriending an accepted one are all the same operation
-- from the client's perspective — no separate "declined" status to track.
drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete using (auth.uid() in (requester_id, recipient_id));

-- profiles' own RLS (select own row only) blocks reading anyone else's
-- name/username/picture directly, so every friends-list read that needs to
-- show *another* user's info goes through one of these four security
-- definer functions instead, each narrowly scoped to exactly the cross-user
-- read/write it needs rather than opening profiles up broadly.

-- Search by name/username/Profile ID (partial match) or email (exact match
-- only, case-insensitive) — exact-only for email specifically so this can't
-- be used to enumerate accounts by trying email fragments, unlike the other
-- fields which are already effectively public (shown on the friends screen,
-- shareable via QR/MenuRow).
create or replace function public.search_profiles(query text)
returns table (
  id uuid,
  public_id text,
  username text,
  first_name text,
  last_name text,
  picture_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.public_id, p.username, p.first_name, p.last_name, p.picture_url
  from public.profiles p
  where p.id <> auth.uid()
    and length(trim(query)) >= 2
    and (
      p.public_id ilike '%' || query || '%'
      or p.username ilike '%' || query || '%'
      or p.first_name ilike '%' || query || '%'
      or p.last_name ilike '%' || query || '%'
      or (p.first_name || ' ' || p.last_name) ilike '%' || query || '%'
      or lower(p.email) = lower(trim(query))
    )
  limit 20;
$$;

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;

-- QR-scan add: both people already proved presence to each other by
-- scanning, so this skips the request/accept dance entirely and upserts the
-- pair straight to 'accepted' — including flipping an existing pending
-- request (either direction) straight to accepted, so scanning a QR code
-- after already sending/receiving a search-based request just confirms it
-- immediately instead of erroring on the conflict.
create or replace function public.add_friend_by_public_id(target_public_id text)
returns table (
  id uuid,
  public_id text,
  username text,
  first_name text,
  last_name text,
  picture_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  select p.id into target from public.profiles p where p.public_id = target_public_id;
  if target is null then
    raise exception 'No Barrow user found with that code.';
  end if;
  if target = auth.uid() then
    raise exception 'That''s your own code.';
  end if;

  insert into public.friendships (requester_id, recipient_id, status)
  values (auth.uid(), target, 'accepted')
  on conflict (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  do update set status = 'accepted', updated_at = now();

  return query
    select p.id, p.public_id, p.username, p.first_name, p.last_name, p.picture_url
    from public.profiles p where p.id = target;
end;
$$;

revoke all on function public.add_friend_by_public_id(text) from public;
grant execute on function public.add_friend_by_public_id(text) to authenticated;

-- Search-based add: sends a request the recipient must accept (see
-- friendships_update_recipient above) — unless they'd already requested
-- *me* first, in which case this just accepts that instead of creating a
-- redundant/conflicting second pending row for the same pair.
create or replace function public.send_friend_request(target_id uuid)
returns public.friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.friendships;
  result public.friendships;
begin
  if target_id = auth.uid() then
    raise exception 'You can''t add yourself.';
  end if;
  if not exists (select 1 from public.profiles where id = target_id) then
    raise exception 'That user no longer exists.';
  end if;

  select * into existing from public.friendships
  where least(requester_id, recipient_id) = least(auth.uid(), target_id)
    and greatest(requester_id, recipient_id) = greatest(auth.uid(), target_id);

  if existing.id is not null then
    if existing.status = 'accepted' then
      raise exception 'You''re already friends.';
    elsif existing.requester_id = auth.uid() then
      raise exception 'Friend request already sent.';
    else
      update public.friendships set status = 'accepted', updated_at = now()
      where id = existing.id
      returning * into result;
      return result;
    end if;
  end if;

  insert into public.friendships (requester_id, recipient_id, status)
  values (auth.uid(), target_id, 'pending')
  returning * into result;
  return result;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

-- Everything the Friends screen needs to render in one call: every
-- friendship row involving the caller, joined to the *other* party's public
-- profile fields (blocked otherwise by profiles' select-own-only RLS), plus
-- whether it's a pending request the caller needs to respond to (as opposed
-- to one they sent, or an already-accepted friendship).
create or replace function public.list_friendships()
returns table (
  friendship_id uuid,
  status text,
  is_incoming boolean,
  other_id uuid,
  public_id text,
  username text,
  first_name text,
  last_name text,
  picture_url text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    f.id,
    f.status,
    (f.status = 'pending' and f.recipient_id = auth.uid()),
    p.id,
    p.public_id,
    p.username,
    p.first_name,
    p.last_name,
    p.picture_url,
    f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.recipient_id)
  order by f.created_at desc;
$$;

revoke all on function public.list_friendships() from public;
grant execute on function public.list_friendships() to authenticated;

-- Backfill email for any profile rows created before this column existed.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email = '';

-- Backfill public_id for any profile rows created before this column
-- existed. Row-by-row (not a single set-based UPDATE) so each call to
-- generate_public_id() sees the previous iteration's value and can't
-- generate the same candidate twice.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where public_id = '' loop
    update public.profiles set public_id = public.generate_public_id() where id = r.id;
  end loop;
end $$;
