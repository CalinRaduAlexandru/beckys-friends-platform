create table if not exists public.admin_monthly_report_notes (
  note_date date primary key,
  note text not null default '',
  updated_at timestamptz not null default now()
);
