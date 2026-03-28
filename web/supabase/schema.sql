-- Budgio IQ — run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Requires: Authentication enabled (Email). Realtime optional (enabled below).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our household',
  monthly_budget_cap numeric,
  bank_link_enabled boolean not null default false,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  display_name text,
  account_email text,
  updated_at timestamptz default now()
);

create index idx_profiles_household on public.profiles (household_id);

-- ---------------------------------------------------------------------------
-- budget tables (all scoped by household_id)
-- ---------------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null
);

create table public.recurring_incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  amount numeric not null,
  frequency text not null,
  anchor_date date not null,
  source_category text not null
);

create table public.one_time_incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  amount numeric not null,
  income_date date not null,
  source_category text not null,
  note text,
  person_ids uuid[] not null default '{}'
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  amount numeric not null,
  expense_date date not null,
  category text not null,
  person_ids uuid[] not null default '{}'
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  label text not null,
  amount numeric not null,
  due_date date not null,
  category text not null,
  person_ids uuid[] not null default '{}'
);

create index idx_people_h on public.people (household_id);
create index idx_rec_h on public.recurring_incomes (household_id);
create index idx_oti_h on public.one_time_incomes (household_id);
create index idx_exp_h on public.expenses (household_id);
create index idx_bills_h on public.bills (household_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.recurring_incomes enable row level security;
alter table public.one_time_incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.bills enable row level security;

-- Helper expression: current user's household
-- Policies use: household_id in (select public.user_household_id())

create or replace function public.user_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.user_household_id() to authenticated, anon;

-- households: members can read/update their row
create policy "households_select_member"
  on public.households for select
  using (id = public.user_household_id());

create policy "households_update_member"
  on public.households for update
  using (id = public.user_household_id());

create policy "households_insert_auth"
  on public.households for insert
  with check (auth.uid() is not null);

-- profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_select_household_peers"
  on public.profiles for select
  using (
    household_id is not null
    and household_id = public.user_household_id()
  );

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Child tables: full CRUD within household
create policy "people_all"
  on public.people for all
  using (household_id = public.user_household_id())
  with check (household_id = public.user_household_id());

create policy "recurring_all"
  on public.recurring_incomes for all
  using (household_id = public.user_household_id())
  with check (household_id = public.user_household_id());

create policy "oti_all"
  on public.one_time_incomes for all
  using (household_id = public.user_household_id())
  with check (household_id = public.user_household_id());

create policy "expenses_all"
  on public.expenses for all
  using (household_id = public.user_household_id())
  with check (household_id = public.user_household_id());

create policy "bills_all"
  on public.bills for all
  using (household_id = public.user_household_id())
  with check (household_id = public.user_household_id());

-- ---------------------------------------------------------------------------
-- Join household by code (avoids exposing household rows to enumeration)
-- ---------------------------------------------------------------------------
create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  old_hid uuid;
  cleaned text;
begin
  cleaned := upper(trim(p_code));
  if length(cleaned) < 4 then
    raise exception 'Invalid code';
  end if;
  select household_id into old_hid from public.profiles where id = auth.uid();
  select h.id into target
  from public.households h
  where h.join_code = cleaned;
  if target is null then
    raise exception 'Invalid code';
  end if;
  if old_hid is not distinct from target then
    return target;
  end if;
  update public.profiles
  set household_id = target, updated_at = now()
  where id = auth.uid();
  if old_hid is not null then
    delete from public.households h
    where h.id = old_hid
      and not exists (select 1 from public.profiles p where p.household_id = old_hid);
  end if;
  return target;
end;
$$;

grant execute on function public.join_household(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (optional — for live updates when partner edits)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.people;
alter publication supabase_realtime add table public.recurring_incomes;
alter publication supabase_realtime add table public.one_time_incomes;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.bills;
alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.profiles;

-- ---------------------------------------------------------------------------
-- Notifications (preferences + Web Push subscriptions)
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_reminders_enabled boolean not null default true,
  push_reminders_enabled boolean not null default true,
  reminder_days_before int not null default 3
    check (reminder_days_before >= 0 and reminder_days_before <= 30),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index idx_push_subs_user on public.push_subscriptions (user_id);

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "notif_prefs_own"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subs_own"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
