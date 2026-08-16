create table if not exists public.playground_survey_responses (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  answers jsonb not null,
  schema_version integer not null default 1,
  constraint playground_survey_answers_object check (jsonb_typeof(answers) = 'object')
);

create index if not exists playground_survey_responses_submitted_idx
  on public.playground_survey_responses (submitted_at desc);

create table if not exists public.playground_survey_funnel_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event_type text not null check (event_type in ('open', 'step', 'complete')),
  step integer not null check (step between 0 and 10),
  section integer null check (section between 1 and 3),
  created_at timestamptz not null default now()
);

create index if not exists playground_survey_funnel_session_idx
  on public.playground_survey_funnel_events (session_id, created_at desc);
create index if not exists playground_survey_funnel_created_idx
  on public.playground_survey_funnel_events (created_at desc);

create table if not exists public.playground_survey_raffle_entries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 60),
  phone text not null check (char_length(phone) between 6 and 24),
  consent boolean not null check (consent = true),
  draw_month date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now()
);

create unique index if not exists playground_survey_raffle_phone_month_idx
  on public.playground_survey_raffle_entries (phone, draw_month);

create index if not exists playground_survey_raffle_created_idx
  on public.playground_survey_raffle_entries (created_at desc);

alter table public.playground_survey_responses enable row level security;
alter table public.playground_survey_funnel_events enable row level security;
alter table public.playground_survey_raffle_entries enable row level security;

revoke all on public.playground_survey_responses from anon, authenticated;
revoke all on public.playground_survey_funnel_events from anon, authenticated;
revoke all on public.playground_survey_raffle_entries from anon, authenticated;

comment on table public.playground_survey_raffle_entries is
  'Contactele opționale pentru extragere sunt stocate separat și nu conțin un identificator al răspunsului la chestionar.';
