alter table public.admin_monthly_report_roles
  add column if not exists metrics text not null default '';
