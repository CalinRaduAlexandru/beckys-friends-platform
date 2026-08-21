create table if not exists public.crm_companions (
  id text primary key,
  first_name text not null,
  relationship_label text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_child_companions (
  child_id text not null references public.crm_children(id) on delete cascade,
  companion_id text not null references public.crm_companions(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (child_id, companion_id)
);

create unique index if not exists crm_child_companions_one_primary_idx
  on public.crm_child_companions (child_id) where is_primary;

alter table public.crm_visits
  add column if not exists companion_id text null references public.crm_companions(id) on delete set null;

create table if not exists public.crm_companion_observations (
  id text primary key,
  companion_id text not null references public.crm_companions(id) on delete cascade,
  visit_id text null references public.crm_visits(id) on delete set null,
  observed_at timestamptz not null,
  observation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_child_companions_companion_idx on public.crm_child_companions (companion_id);
create index if not exists crm_visits_companion_date_idx on public.crm_visits (companion_id, visit_date desc);
create index if not exists crm_companion_observations_companion_idx on public.crm_companion_observations (companion_id, observed_at desc);

alter table public.crm_companions enable row level security;
alter table public.crm_child_companions enable row level security;
alter table public.crm_companion_observations enable row level security;
revoke all on public.crm_companions from anon, authenticated;
revoke all on public.crm_child_companions from anon, authenticated;
revoke all on public.crm_companion_observations from anon, authenticated;
