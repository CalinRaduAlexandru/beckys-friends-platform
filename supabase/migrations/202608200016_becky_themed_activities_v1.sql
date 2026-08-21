create table if not exists public.admin_becky_themed_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  age_categories text[] not null default '{}',
  participant_categories text[] not null default '{}',
  duration_categories text[] not null default '{}',
  category text not null,
  skills text not null default '',
  implementation text not null,
  materials text not null default '',
  steps text not null default '',
  rules text not null default '',
  facilitator text not null default '',
  easier text not null default '',
  harder text not null default '',
  caution text not null default '',
  reflection text not null default '',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.admin_becky_themed_activity_validations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.admin_becky_themed_activities(id) on delete cascade,
  age_category text not null,
  participant_category text not null,
  validation_status text not null default 'idea' check (validation_status in ('idea','validated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, age_category, participant_category)
);
create index if not exists admin_becky_themed_activities_status_idx on public.admin_becky_themed_activities(status);
create index if not exists admin_becky_themed_activity_validations_activity_idx on public.admin_becky_themed_activity_validations(activity_id);
insert into public.admin_becky_themed_activities (id,title,subtitle,age_categories,participant_categories,category,implementation,status)
values ('14141414-1414-4141-8141-141414141414','Becky spune','Un joc de mișcare și atenție în care copiii urmează doar comenzile care încep cu „Becky spune”.',array['5–6 ani','7–8 ani'],array['Individual','2–3 copii','4–9 copii','10+ copii'],'Se mișcă','Fără echipament','active')
on conflict (id) do nothing;
insert into public.admin_becky_themed_activity_validations (activity_id,age_category,participant_category,validation_status)
select '14141414-1414-4141-8141-141414141414', age_category, participant_category, case when age_category = '5–6 ani' and participant_category in ('Individual','2–3 copii') then 'validated' else 'idea' end
from unnest(array['5–6 ani','7–8 ani']) age_category
cross join unnest(array['Individual','2–3 copii','4–9 copii','10+ copii']) participant_category
on conflict (activity_id,age_category,participant_category) do nothing;
