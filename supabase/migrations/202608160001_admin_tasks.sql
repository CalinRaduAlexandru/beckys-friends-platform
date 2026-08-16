create table if not exists public.admin_tasks (
  id text primary key,
  area text not null,
  title text not null,
  detail text not null default '',
  owner text not null,
  priority text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_tasks_area_sort_order_idx
  on public.admin_tasks (area, sort_order, created_at);

alter table public.admin_tasks enable row level security;
