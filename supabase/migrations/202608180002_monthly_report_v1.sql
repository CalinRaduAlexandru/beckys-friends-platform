create table if not exists public.admin_monthly_report_roles (
  id text primary key,
  month_key text not null default '2026-08',
  label text not null,
  status text not null default 'Fără suficiente date',
  objectives text not null default '',
  metrics text not null default '',
  done text not null default '',
  evidence text not null default '',
  learned text not null default '',
  next_step text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_monthly_report_roles (id, label, sort_order) values
  ('experienta-copilului', 'Experiența copilului', 0),
  ('relatia-cu-parintii', 'Relația cu părinții', 1),
  ('design-pedagogic', 'Design pedagogic', 2),
  ('cultura-experienta-becky', 'Cultura & experiența Becky', 3),
  ('marketing-comunicare', 'Marketing & comunicare', 4),
  ('sisteme-tehnologie', 'Sisteme & tehnologie', 5),
  ('operatiuni-logistica', 'Operațiuni & logistică', 6),
  ('strategie-dezvoltare', 'Strategie & dezvoltare', 7)
on conflict (id) do nothing;
