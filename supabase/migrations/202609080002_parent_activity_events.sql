create table if not exists public.parent_activity_events (
  id uuid primary key,
  event_name text not null,
  session_id uuid not null,
  visit_id uuid,
  activity_id text,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  is_test boolean not null default false,
  viewport text not null,
  display_mode text not null,
  details jsonb not null default '{}'::jsonb
);
create index if not exists parent_activity_events_time_idx on public.parent_activity_events (occurred_at desc);
create index if not exists parent_activity_events_activity_idx on public.parent_activity_events (activity_id, occurred_at desc);
alter table public.parent_activity_events enable row level security;
revoke all on public.parent_activity_events from anon, authenticated;
grant select, insert on public.parent_activity_events to service_role;
