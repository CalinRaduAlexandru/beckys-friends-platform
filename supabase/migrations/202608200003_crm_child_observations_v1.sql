create table if not exists public.crm_child_observations (
  id text primary key,
  child_id text not null references public.crm_children(id) on delete cascade,
  visit_id text null references public.crm_visits(id) on delete set null,
  observed_at timestamptz not null,
  observation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_child_observations_child_date_idx
  on public.crm_child_observations (child_id, observed_at desc, created_at desc);

alter table public.crm_child_observations enable row level security;
revoke all on public.crm_child_observations from anon, authenticated;
