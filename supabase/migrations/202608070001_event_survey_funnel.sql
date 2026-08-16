create table if not exists public.event_survey_funnel_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event_type text not null check (event_type in ('open', 'step', 'complete')),
  step integer not null check (step between 0 and 13),
  section integer null check (section between 0 and 3),
  milestone integer null check (milestone between 0 and 2),
  duel_index integer null check (duel_index between 0 and 20),
  created_at timestamptz not null default now()
);

create index if not exists event_survey_funnel_session_idx
  on public.event_survey_funnel_events (session_id, created_at desc);

create index if not exists event_survey_funnel_created_at_idx
  on public.event_survey_funnel_events (created_at desc);

alter table public.event_survey_funnel_events enable row level security;
revoke all on public.event_survey_funnel_events from anon, authenticated;
