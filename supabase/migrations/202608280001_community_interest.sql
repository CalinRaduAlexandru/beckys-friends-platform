create table if not exists public.community_interest (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  phone_normalized text not null,
  motivation text null,
  consent boolean not null default false,
  source text not null default 'community_page',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_interest_name_length check (char_length(name) between 2 and 100),
  constraint community_interest_email_length check (char_length(email) between 3 and 200),
  constraint community_interest_phone_length check (char_length(phone_normalized) between 9 and 15),
  constraint community_interest_motivation_length check (motivation is null or char_length(motivation) <= 1000),
  constraint community_interest_consent_required check (consent = true)
);

create unique index if not exists community_interest_email_unique_idx
  on public.community_interest (email);

create unique index if not exists community_interest_phone_unique_idx
  on public.community_interest (phone_normalized);

create index if not exists community_interest_updated_at_idx
  on public.community_interest (updated_at desc);

alter table public.community_interest enable row level security;
revoke all on public.community_interest from anon, authenticated;
