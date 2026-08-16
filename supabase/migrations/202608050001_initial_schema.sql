create extension if not exists pgcrypto;

create table if not exists public.app_documents (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

create table if not exists public.event_survey_responses (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  answers jsonb not null,
  duels jsonb not null,
  concept_ranking jsonb not null,
  schema_version integer not null default 1,
  constraint event_survey_answers_object check (jsonb_typeof(answers) = 'object'),
  constraint event_survey_duels_array check (jsonb_typeof(duels) = 'array'),
  constraint event_survey_ranking_array check (jsonb_typeof(concept_ranking) = 'array')
);

create index if not exists event_survey_responses_submitted_at_idx
  on public.event_survey_responses (submitted_at desc);

alter table public.app_documents enable row level security;
alter table public.event_survey_responses enable row level security;

revoke all on public.app_documents from anon, authenticated;
revoke all on public.event_survey_responses from anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_documents_set_updated_at on public.app_documents;
create trigger app_documents_set_updated_at
before update on public.app_documents
for each row execute function public.set_updated_at();

