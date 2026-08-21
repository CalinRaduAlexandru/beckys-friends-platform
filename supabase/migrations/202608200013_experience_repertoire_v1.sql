create table if not exists public.admin_experience_repertoire_items (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (stage in ('welcome','surprise_connect','next_visit_thread','memorable_close')),
  title text not null,
  description text not null default '',
  age_groups text[] not null default '{}',
  status text not null default 'active' check (status in ('active','archived')),
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_experience_repertoire_items_status_idx on public.admin_experience_repertoire_items(status);
create index if not exists admin_experience_repertoire_items_age_groups_idx on public.admin_experience_repertoire_items using gin(age_groups);
