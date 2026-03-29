-- Shared Gemini API key for Insights (all household members can read/update via RLS).
alter table public.households
  add column if not exists gemini_api_key text;

comment on column public.households.gemini_api_key is
  'Optional Google AI (Gemini) API key for Insights; visible to household members only.';
