create table if not exists public.admin_becky_memory_signals (
  id text primary key,
  source_type text not null default 'daily_note',
  source_note_id text not null,
  source_version text not null,
  source_hash text not null,
  source_date date not null,
  exact_source_excerpt text not null,
  normalized_observation text not null,
  epistemic_type text not null check (epistemic_type in ('observed','direct_quote','activity_evidence')),
  entities jsonb not null default '[]'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  age_categories jsonb not null default '[]'::jsonb,
  possible_canonical_context jsonb not null default '[]'::jsonb,
  canonical_context jsonb not null default '[]'::jsonb,
  confidence numeric not null check (confidence between 0 and 1),
  provenance jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_becky_memory_signals_source_idx on public.admin_becky_memory_signals (source_note_id, source_version, source_date desc);

create table if not exists public.admin_becky_attention_candidates (
  id text primary key,
  fingerprint text not null,
  title text not null,
  summary text not null,
  why_it_matters text not null,
  suggested_next_step text not null,
  evidence_signal_ids jsonb not null default '[]'::jsonb,
  counter_evidence_signal_ids jsonb not null default '[]'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  age_categories jsonb not null default '[]'::jsonb,
  relevance_score numeric not null check (relevance_score between 0 and 100),
  confidence numeric not null check (confidence between 0 and 1),
  independent_evidence_count integer not null,
  date_count integer not null,
  entity_count integer not null,
  reason_for_attention text not null,
  status text not null default 'active' check (status in ('active','investigating','promoted','dismissed')),
  knowledge_candidate_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_becky_attention_candidates_status_idx on public.admin_becky_attention_candidates (status, updated_at desc);

alter table public.admin_becky_memory_signals enable row level security;
alter table public.admin_becky_attention_candidates enable row level security;
revoke all on public.admin_becky_memory_signals from anon, authenticated;
revoke all on public.admin_becky_attention_candidates from anon, authenticated;
