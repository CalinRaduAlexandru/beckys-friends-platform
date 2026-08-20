create table if not exists public.admin_monthly_report_entries (
  id text primary key,
  month_key text not null default '2026-08',
  entry_date date not null,
  type text not null check (type in ('done', 'evidence', 'learned')),
  text text not null,
  role_ids text[] not null default '{}',
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_monthly_report_entries_role_ids_check check (role_ids <@ ARRAY[
    'experienta-copilului', 'relatia-cu-parintii', 'design-pedagogic', 'cultura-experienta-becky',
    'marketing-comunicare', 'sisteme-tehnologie', 'operatiuni-logistica', 'strategie-dezvoltare'
  ]::text[])
);

create index if not exists admin_monthly_report_entries_month_date_idx
  on public.admin_monthly_report_entries (month_key, entry_date desc, created_at desc);

alter table public.admin_monthly_report_entries enable row level security;
revoke all on table public.admin_monthly_report_entries from anon, authenticated;
