create table if not exists public.admin_event_community_findings (
  id text primary key,
  kind text not null check (kind in ('observation','feedback','component_idea','hypothesis','pilot_result')),
  text text not null,
  event_ref text,
  concept_ref text,
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_event_community_findings_kind_idx on public.admin_event_community_findings (kind, updated_at desc);
alter table public.admin_event_community_findings enable row level security;
revoke all on table public.admin_event_community_findings from anon, authenticated;
