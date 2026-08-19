create table if not exists public.crm_children (
  id text primary key,
  first_name text not null,
  age integer not null check (age >= 0 and age <= 18),
  interests text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_visits (
  id text primary key,
  child_id text not null references public.crm_children(id) on delete cascade,
  visit_date date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists crm_visits_child_date_idx
  on public.crm_visits (child_id, visit_date desc);

alter table public.crm_children enable row level security;
alter table public.crm_visits enable row level security;
