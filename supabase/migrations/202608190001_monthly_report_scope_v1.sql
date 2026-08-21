alter table public.admin_monthly_report_roles
  add column if not exists scope text not null default '';
