alter table public.admin_activity_observations
  add column if not exists behaviors jsonb not null default '[]'::jsonb;
