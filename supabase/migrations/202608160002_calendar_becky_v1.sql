create table if not exists public.calendar_becky_entries (
  id text primary key,
  title text not null,
  type text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_becky_entries_date_time_idx
  on public.calendar_becky_entries (date, start_time, end_time);

alter table public.calendar_becky_entries enable row level security;
