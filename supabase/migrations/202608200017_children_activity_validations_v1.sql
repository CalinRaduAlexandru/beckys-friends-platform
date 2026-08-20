create table if not exists public.admin_children_activity_validations (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null,
  age_category text not null,
  participant_category text not null,
  validation_status text not null default 'idea' check (validation_status in ('idea','validated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, age_category, participant_category)
);
create index if not exists admin_children_activity_validations_activity_idx
  on public.admin_children_activity_validations(activity_id);
