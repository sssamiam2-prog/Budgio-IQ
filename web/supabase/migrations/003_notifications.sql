-- Per-user reminder preferences and Web Push subscription storage.
-- Run after earlier migrations. Email/push sending uses Edge Functions + secrets (see supabase/functions).

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
