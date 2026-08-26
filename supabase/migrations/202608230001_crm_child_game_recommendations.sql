alter table public.crm_children
  add column if not exists game_recommendations text not null default '';
