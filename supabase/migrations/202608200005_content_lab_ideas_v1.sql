-- Persistent recipient for the existing admin Content Lab.
-- This is intentionally separate from tenant-scoped macro_ideas: the current
-- admin runtime has no account/workspace context and this table is the minimal
-- bridge until Content OS tenancy is wired into the admin shell.
create table if not exists public.admin_content_lab_ideas (
  id text primary key,
  idea_type text not null check (idea_type in ('growth_story', 'behind_the_scenes', 'authority_expertise', 'reusable_insight')),
  title text not null default '',
  core_thought text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_content_lab_ideas_type_status_idx
  on public.admin_content_lab_ideas (idea_type, status, updated_at desc);

alter table public.admin_content_lab_ideas enable row level security;
revoke all on table public.admin_content_lab_ideas from anon, authenticated;
