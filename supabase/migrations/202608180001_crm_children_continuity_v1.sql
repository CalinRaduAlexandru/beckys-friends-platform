alter table public.crm_children
  add column if not exists continuity text not null default '';
