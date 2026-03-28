-- Run in Supabase SQL Editor if you already applied schema.sql (safe to run once).
-- Lets signed-in users see other members of the same household (for "who has access").
-- Stores account email on the profile row for display (same visibility as household data).

alter table public.profiles
  add column if not exists account_email text;

comment on column public.profiles.account_email is 'Copy of auth email for household member list; visible only to same household via RLS.';

-- Household peers can read each others profile rows (name + email for member list)
drop policy if exists "profiles_select_household_peers" on public.profiles;
create policy "profiles_select_household_peers"
  on public.profiles for select
  using (
    household_id is not null
    and household_id = public.user_household_id()
  );

-- Realtime: member list updates when someone joins or updates profile
alter publication supabase_realtime add table public.profiles;
