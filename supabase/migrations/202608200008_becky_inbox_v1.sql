create table if not exists public.admin_becky_inbox_proposals (
  id text primary key,
  source_type text not null,
  source_id text not null,
  source_version text not null,
  source_hash text not null,
  source_excerpt text not null default '',
  destination text not null check (destination in ('activity_observation','crm_child_observation','monthly_report_entry','task','content_lab_idea','event_community_finding','knowledge_candidate')),
  operation text not null,
  target_entity_type text,
  target_entity_id text,
  target_candidates jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  field_provenance jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','ignored','failed')),
  validation_errors jsonb not null default '[]'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  destination_entity_id text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  executed_at timestamptz,
  last_error text
);
create index if not exists admin_becky_inbox_source_idx on public.admin_becky_inbox_proposals (source_type, source_id, created_at desc);
create index if not exists admin_becky_inbox_review_idx on public.admin_becky_inbox_proposals (status, destination, created_at desc);
alter table public.admin_becky_inbox_proposals enable row level security;
revoke all on public.admin_becky_inbox_proposals from anon, authenticated;
