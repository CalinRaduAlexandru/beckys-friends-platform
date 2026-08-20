create table if not exists public.admin_becky_brief_insights (
  id text primary key,
  source_type text not null default 'daily_note',
  source_id text not null,
  source_version text not null,
  source_hash text not null,
  insight_title text not null,
  insight_summary text not null,
  why_it_matters text not null,
  recommended_action text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  category text not null check (category in ('problem','opportunity','pattern','risk','learning','next_test')),
  relevance_score numeric not null check (relevance_score between 0 and 100),
  confidence numeric not null check (confidence between 0 and 1),
  rank_score numeric not null,
  related_proposal_ids jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_becky_brief_source_idx
  on public.admin_becky_brief_insights (source_type, source_id, source_version, sort_order);

alter table public.admin_becky_brief_insights enable row level security;
revoke all on public.admin_becky_brief_insights from anon, authenticated;
