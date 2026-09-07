create table if not exists public.parent_progress_profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_key text not null unique,
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_progress_username_length check (char_length(username) between 1 and 80),
  constraint parent_progress_username_key_length check (char_length(username_key) between 1 and 80),
  constraint parent_progress_object check (jsonb_typeof(progress) = 'object')
);

create index if not exists parent_progress_profiles_updated_at_idx
  on public.parent_progress_profiles (updated_at desc);

alter table public.parent_progress_profiles enable row level security;
revoke all on public.parent_progress_profiles from anon, authenticated;

drop trigger if exists parent_progress_profiles_set_updated_at on public.parent_progress_profiles;
create trigger parent_progress_profiles_set_updated_at
before update on public.parent_progress_profiles
for each row execute function public.set_updated_at();
