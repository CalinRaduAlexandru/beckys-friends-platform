create table if not exists public.admin_activity_observations (
  id text primary key,
  activity_id text not null,
  tested_at date not null,
  age_categories text[] not null default '{}',
  participants text not null,
  result text not null,
  observed text not null,
  interpreted text not null default '',
  hypothesized text not null default '',
  action text not null default '',
  capacity text not null default '',
  behavior_observed boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_activity_observations_activity_idx on public.admin_activity_observations(activity_id, tested_at desc, created_at desc);

alter table public.admin_activity_observations enable row level security;
revoke all on public.admin_activity_observations from anon, authenticated;
