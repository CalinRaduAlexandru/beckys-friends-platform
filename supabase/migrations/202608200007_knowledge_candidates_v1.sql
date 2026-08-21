create table if not exists public.admin_knowledge_candidates (
  id text primary key,
  target text not null check (target in ('operational_manual','puieti_de_oameni','community_guide','strategic_plan')),
  text text not null,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_knowledge_candidates_filter_idx on public.admin_knowledge_candidates (target, status, updated_at desc);
alter table public.admin_knowledge_candidates enable row level security;
revoke all on table public.admin_knowledge_candidates from anon, authenticated;
